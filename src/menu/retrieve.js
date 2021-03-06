
/*
 * Copyright 2018, Bloombox, LLC. All rights reserved.
 *
 * Source and object computer code contained herein is the private intellectual
 * property of Bloombox, a California Limited Liability Corporation. Use of this
 * code in source form requires permission in writing before use or the
 * assembly, distribution, or publishing of derivative works, for commercial
 * purposes or any other purpose, from a duly authorized officer of Momentum
 * Ideas Co.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Bloombox: Menu Retrieve
 *
 * @fileoverview Provides the ability to fetch menu data via the Menu API.
 */

/*global goog */

goog.provide('bloombox.menu.MenuRetrieveException');
goog.provide('bloombox.menu.retrieve');

goog.require('bloombox.config.active');

goog.require('bloombox.logging.error');
goog.require('bloombox.logging.info');
goog.require('bloombox.logging.log');
goog.require('bloombox.logging.warn');

goog.require('bloombox.menu.Routine');
goog.require('bloombox.menu.rpc.MenuRPC');


// -- Structures -- //

/**
 * Callback function type declaration for menu data retrieval.
 *
 * @typedef {function(?Object, ?number)}
 */
bloombox.menu.MenuRetrieveCallback;


/**
 * Represents an exception that occurred while retrieving menu data for a given
 * partner/location pair.
 *
 * @param {string} message Exception error message.
 * @constructor
 * @export
 */
bloombox.menu.MenuRetrieveException = function MenuRetrieveException(message) {
  /**
   * Exception message.
   *
   * @type {string}
   */
  this.message = message;
};


/**
 * Public accessor method to retrieve this exception's error message.
 *
 * @return {string}
 * @export
 */
bloombox.menu.MenuRetrieveException.prototype.getMessage = function() {
  return this.message;
};


/**
 * Retrieve menu data for the current partner/location pair.
 *
 * @param {bloombox.menu.MenuRetrieveCallback} callback Operation callback.
 * @throws {bloombox.menu.MenuRetrieveException} If partner/location isn't set,
 *         or some other client-side error occurs.
 * @export
 */
bloombox.menu.retrieve = function(callback) {
  // load partner and location codes
  let config = bloombox.config.active();
  let partnerCode = config.partner;
  let locationCode = config.location;

  if (!partnerCode ||
    !(typeof partnerCode === 'string' && partnerCode.length > 1) ||
    !(typeof locationCode === 'string' && locationCode.length > 1))
    throw new bloombox.menu.MenuRetrieveException(
      'Partner and location must be set via `bloombox.menu.setup` before' +
      ' retrieving menu data.');

  bloombox.logging.info('Retrieving menu for \'' +
    partnerCode + ':' + locationCode + '\'...');

  // stand up an RPC object
  const rpc = new bloombox.menu.rpc.MenuRPC(
    /** @type {bloombox.menu.Routine} */ (bloombox.menu.Routine.RETRIEVE),
    'GET', [
      'partners', partnerCode,
      'locations', locationCode,
      'global:retrieve'].join('/'));

  let done = false;
  rpc.send(function(response) {
    if (done) return;
    if (response !== null) {
      done = true;

      bloombox.logging.log('Received response for menu data RPC.', response);
      if (typeof response === 'object') {
        // dispatch the callback
        callback(response, null);
      } else {
        bloombox.logging.error(
          'Received unrecognized response for menu data RPC.', response);
        callback(null, null);
      }
    }
  }, function(status) {
    bloombox.logging.error(
      'An error occurred while querying menu data. Status code: \'' +
      status + '\'.');

    // pass null to indicate an error
    callback(null, status || null);
  });
};
