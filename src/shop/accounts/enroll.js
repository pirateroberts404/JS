
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
 * Bloombox: Enroll
 *
 * @fileoverview Provides a method to enroll a new customer.
 */

/*global goog */

goog.provide('bloombox.shop.enroll.EnrollCallback');
goog.provide('bloombox.shop.enroll.Enrollment');
goog.provide('bloombox.shop.enroll.EnrollmentException');

goog.require('bloombox.config.active');

goog.require('bloombox.identity.ConsumerProfile');
goog.require('bloombox.identity.ContactInfo');
goog.require('bloombox.identity.DoctorRec');
goog.require('bloombox.identity.EnrollmentSource');
goog.require('bloombox.identity.ID');
goog.require('bloombox.identity.Person');
goog.require('bloombox.identity.PersonException');
goog.require('bloombox.identity.StreetAddress');

goog.require('bloombox.logging.error');
goog.require('bloombox.logging.log');
goog.require('bloombox.logging.warn');

goog.require('bloombox.shop.Customer');

goog.require('bloombox.shop.Routine');
goog.require('bloombox.shop.rpc.ShopRPC');

goog.require('bloombox.telemetry.event');
goog.require('bloombox.telemetry.notifyUserID');

goog.require('proto.bloombox.identity.EnrollmentSource');
goog.require('proto.bloombox.services.shop.v1.EnrollMember');
goog.require('proto.bloombox.services.shop.v1.EnrollmentError');


/**
 * Callback function type definition for enroll RPCs.
 *
 * @typedef {function(boolean, ?proto.bloombox.services.shop.v1.EnrollmentError, ?bloombox.shop.Customer)}
 */
bloombox.shop.enroll.EnrollCallback;


/**
 * Represents an exception that occurred while preparing or submitting
 * a verification request.
 *
 * @param {string} message Exception error message.
 * @constructor
 * @export
 */
bloombox.shop.enroll.EnrollmentException = function VerifyException(message) {
  this.message = message;
};


// -- Enrollment -- //

/**
 * Request to enroll a new user, including their driver's license, doctor's
 * recommendation for cannabis, contact info, and account password.
 *
 * @param {bloombox.identity.EnrollmentSource} source Source type for this
 *        enrollment.
 * @param {string} channel Channel source identifier for this enrollment.
 * @param {bloombox.identity.Person} person Person enrolling for the account.
 * @param {?bloombox.identity.DoctorRec} rec Person's doctor rec.
 * @param {bloombox.identity.ID} license Person's driver's license or other ID.
 * @param {?string=} opt_password User's password. Optional.
 * @param {?bloombox.identity.ConsumerProfile=} opt_profile Consumer profile.
 * @constructor
 * @export
 */
bloombox.shop.enroll.Enrollment = function Enrollment(source,
                                                      channel,
                                                      person,
                                                      rec,
                                                      license,
                                                      opt_password,
                                                      opt_profile) {
  /**
   * User ID resulting from this enrollment, once it has completed.
   *
   * @type {?string}
   * @package
   */
  this.id = null;

  /**
   * User key resulting from this enrollment, once it has completed.
   *
   * @type {?string}
   * @package
   */
  this.key = null;

  /**
   * Foreign ID resulting from this enrollment, once it has completed.
   *
   * @type {?string}
   * @package
   */
  this.foreignId = null;

  /**
   * Enrollment source.
   *
   * @export
   * @type {bloombox.identity.EnrollmentSource}
   */
  this.source = source;

  /**
   * Channel source identifier.
   *
   * @export
   * @type {string}
   */
  this.channel = channel;

  /**
   * Person who is enrolling.
   *
   * @export
   * @type {bloombox.identity.Person}
   */
  this.person = person;

  /**
   * Doctor's recommendation.
   *
   * @export
   * @type {?bloombox.identity.DoctorRec}
   */
  this.doctorRec = rec;

  /**
   * Person's driver's license.
   *
   * @export
   * @type {bloombox.identity.ID}
   */
  this.license = license;

  /**
   * Base64-encoded account password, if provided.
   *
   * @public
   * @type {?string}
   */
  this.password = (opt_password !== null && opt_password !== undefined) ? btoa(
      /** @type {string} */ (opt_password)) : null;

  /**
   * User's profile. Defaults to null.
   *
   * @export
   * @type {?bloombox.identity.ConsumerProfile}
   */
  this.profile = opt_profile || null;

  /**
   * Dry-run status for this enrollment. When truthy, this will prevent the
   * subject user from being written to any persistence or external systems.
   * The enrollment is still verified and logged, though, for testing.
   *
   * @export
   * @type {boolean}
   */
  this.dryRun = false;
};


/**
 * Return this enrollment's resulting user ID.
 *
 * @return {?string} User ID.
 * @export
 */
bloombox.shop.enroll.Enrollment.prototype.getId = function() {
  return this.id;
};


/**
 * Set this enrollment's resulting user ID.
 *
 * @param {string} id User ID to set.
 * @package
 */
bloombox.shop.enroll.Enrollment.prototype.setId = function(id) {
  this.id = id;
};


/**
 * Return this enrollment's resulting user key.
 *
 * @return {?string} User key.
 * @export
 */
bloombox.shop.enroll.Enrollment.prototype.getKey = function() {
  return this.key;
};


/**
 * Set this enrollment's resulting user key.
 *
 * @param {string} key Resulting user key.
 * @package
 */
bloombox.shop.enroll.Enrollment.prototype.setKey = function(key) {
  this.key = key;
};


/**
 * Set this user's resulting foreign ID.
 *
 * @param {string} foreignId This user's foreign ID.
 * @package
 */
bloombox.shop.enroll.Enrollment.prototype.setForeignId = function(foreignId) {
  this.foreignId = foreignId;
};


/**
 * Return this enrollment's resulting foreign ID.
 *
 * @return {?string} User's foreign ID for the currently-active partner scope.
 * @export
 */
bloombox.shop.enroll.Enrollment.prototype.getForeignId = function() {
  return this.foreignId;
};


// noinspection JSUnusedGlobalSymbols
/**
 * Activate dry run mode.
 *
 * @return {bloombox.shop.enroll.Enrollment} Self, for chain-ability.
 * @export
 */
bloombox.shop.enroll.Enrollment.prototype.enableDryRun = function() {
  this.dryRun = true;
  return this;
};


/**
 * Submit analytics data after an enrollment request has been sent to the server
 * and indicate whether it was successful or not.
 *
 * @param {?string} key Key for the resulting user, if enrollment succeeded.
 * @param {?string} foreignId Foreign ID for the user, if enrollment succeeded.
 * @param {?proto.bloombox.services.shop.v1.EnrollmentError=} opt_error
 *        Error that was reported by the server, if any.
 * @param {?number=} opt_status Status reported by the server, if the enrollment
 *        was rejected.
 */
bloombox.shop.enroll.Enrollment.prototype.sendAnalytics = function(key,
                                                                   foreignId,
                                                                   opt_error,
                                                                   opt_status) {
  bloombox.telemetry.event(
    bloombox.telemetry.InternalCollection.ENROLLMENT,
    {'action': opt_error ? 'error' : 'enroll',
     'status': opt_status ? opt_status : 200,
     'customer': {'foreignId': this.foreignId.trim()},
     'enrollment': {
        'key': this.key.trim(),
        'channel': this.channel,
        'source': this.source}}).send();
};


/**
 * Send the RPC to enroll a user.
 *
 * @param {bloombox.shop.enroll.EnrollCallback} callback Enrollment callback.
 * @export
 */
bloombox.shop.enroll.Enrollment.prototype.send = function(callback) {
  let config = bloombox.config.active();
  let partner = config.partner;
  let location = config.location;

  if (!partner || !location) {
    bloombox.logging.error('Partner or location code is not defined.');
    return;
  }

  let rawObject = {
    'person': {
      'name': {
        'firstName': this.person.name.getFirstName(),
        'lastName': this.person.name.getLastName()
      },
      'contact': {
        'email': {'address': this.person.contactInfo.emailAddress},
        'phone': {'e164': this.person.contactInfo.phoneNumber},
        'location': {
          'address': {
            'firstLine': this.person.contactInfo.streetAddress.firstLine,
            'secondLine': this.person.contactInfo.streetAddress.secondLine,
            'city': this.person.contactInfo.streetAddress.city,
            'state': this.person.contactInfo.streetAddress.state,
            'zipcode': this.person.contactInfo.streetAddress.zip,
            'country': this.person.contactInfo.streetAddress.country
          }
        }
      },
      'dateOfBirth': {
        'iso8601': this.person.dateOfBirth.getIso8601()
      }
    },
    'source': this.source,
    'channel': this.channel,
    'governmentId': {
      'id': this.license.id,
      'expireDate': {
        'iso8601': this.license.expirationDate.getIso8601()
      },
      'birthDate': {
        'iso8601': this.license.birthDate.getIso8601()
      },
      'license': {
        'jurisdiction': this.license.jurisdiction.toUpperCase()
      }
    }
  };

  if (this.doctorRec !== null) {
    rawObject['doctorRec'] = {
      'id': this.doctorRec.id,
        'expirationDate': {
        'iso8601': this.doctorRec.expirationDate.getIso8601()
      },
      'state': this.doctorRec.state,
      'country': this.doctorRec.country || 'USA',
      'doctor': {
        'contact': {},
        'name': {
          'firstName': this.doctorRec.doctorName.getFirstName(),
            'lastName': this.doctorRec.doctorName.getLastName()
        }
      }
    };

    if (this.doctorRec.doctorWebsite !== null)
      rawObject['doctorRec']['doctor']['contact']['website'] = {
        'uri': this.doctorRec.doctorWebsite
      };
    if (this.doctorRec.doctorPhone)
      rawObject['doctorRec']['doctor']['contact']['phone'] = {
        'phone': {'e164': this.doctorRec.doctorPhone}
      };
  }

  // copy in user profile
  if (this.profile !== null) {
    rawObject['consumerProfile'] = this.profile.serialize();
  }

  // copy in password, if it's there
  if (this.password !== null) rawObject['password'] = this.password;

  // copy in doctor website, if it's there
  if (this.dryRun === true)
    rawObject['dryRun'] = true;

  bloombox.logging.info('Enrolling user...',
    {'payload': rawObject, 'enrollment': this});

  const rpc = new bloombox.shop.rpc.ShopRPC(
    /** @type {bloombox.shop.Routine} */ (bloombox.shop.Routine.ENROLL_USER),
    'POST', [
      'partners', partner,
      'locations', location,
      'members'].join('/'), rawObject);

  let done = false;
  let personObj = this.person;
  let enrollment = this;

  rpc.send(function(response) {
    if (done) return;
    if (response !== null) {
      done = true;

      bloombox.logging.log('Response received for enrollment RPC.', response);
      let inflated = (
        new proto.bloombox.services.shop.v1.EnrollMember.Response());
      if (response['error']) {
        // an error occurred
        inflated.setError(response['error']);
        callback(false, inflated.getError(), null);
        enrollment.sendAnalytics(null, null, inflated.getError());
      } else {
        if (response['id'] && response['foreignId']) {
          // we have a resulting customer object and ID
          inflated.setId(response['id']);
          inflated.setForeignId(response['foreignId']);

          // Notify analytics of the new active user ID.
          bloombox.telemetry.notifyUserID(inflated.getId());

          enrollment.setKey(inflated.getId());
          enrollment.setForeignId(inflated.getForeignId());
          let customer = new bloombox.shop.Customer(
            personObj,
            response['foreignId']);

          bloombox.logging.log('Decoded customer from response.', customer);
          callback(true, null, customer);
          enrollment.sendAnalytics(
            inflated.getId(), inflated.getForeignId(), null);
        } else {
          bloombox.logging.error(
            'Failed to find customer or ID in response.',
            response);
          callback(false, null, null);
        }
      }
    } else {
      bloombox.logging.warn('Failed to inflate RPC.', response);
      callback(false, null, null);
      enrollment.sendAnalytics(null, null);
    }
  }, function(status, response, error_code, error_message) {
    bloombox.logging.error(status ?
      'Enrollment RPC failed with unexpected status: \'' + status + '\'.' :
      'Enrollment RPC response failed to be decoded.', {
        'status': status,
        'response': response,
        'code': error_code,
        'message': error_message});

    if (error_code) {
      let inflated = (
        new proto.bloombox.services.shop.v1.EnrollMember.Response());
      inflated.setError(
        /** @type {proto.bloombox.services.shop.v1.EnrollmentError} */
        (error_code));
      callback(false, inflated.getError(), null);
    } else {
      callback(false, null, null);
    }

    enrollment.sendAnalytics(null, null, null, status);
  });
};
