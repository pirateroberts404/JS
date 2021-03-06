
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
 * Bloombox Telemetry Context: Web Application
 *
 * @fileoverview Specifies event context related to the active web application
 * sending events, if applicable.
 */

/*global goog */

goog.require('proto.bloombox.analytics.context.WebApplication');
goog.provide('bloombox.telemetry.buildWebappContext');


/**
 * Generate and return context for the current web application.
 *
 * @return {proto.bloombox.analytics.context.WebApplication}
 * @package
 */
bloombox.telemetry.buildWebappContext = function() {
  // collect data
  let origin = window.location.origin;
  let location = window.location.href;
  let anchor = window.location.hash;
  let protocol = window.location.protocol;
  let title = document.title;
  let referrer = document.referrer;

  // fill out object
  let webapp = new proto.bloombox.analytics.context.WebApplication();
  webapp.setOrigin(origin);
  webapp.setLocation(location);
  webapp.setTitle(title);
  webapp.setProtocol(protocol);
  webapp.setReferrer(referrer);
  if (anchor) webapp.setAnchor(anchor);
  return webapp;
};
