
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
 * Bloombox Shop: Customer
 *
 * @fileoverview Provides a Customer object for ordering/commerce.
 */

/*global goog */

goog.require('bloombox.identity.ContactInfo');
goog.require('bloombox.identity.Person');

goog.require('bloombox.logging.log');

goog.require('bloombox.util.Exportable');

goog.require('proto.bloombox.identity.ConsumerProfile');

goog.require('proto.opencannabis.commerce.Customer');
goog.require('proto.opencannabis.contact.ContactInfo');
goog.require('proto.opencannabis.contact.EmailAddress');
goog.require('proto.opencannabis.contact.PhoneNumber');
goog.require('proto.opencannabis.geo.Address');
goog.require('proto.opencannabis.geo.Location');
goog.require('proto.opencannabis.person.Name');

goog.provide('bloombox.shop.Customer');
goog.provide('bloombox.shop.Customer.fromResponse');
goog.provide('bloombox.shop.CustomerException');
goog.provide('bloombox.shop.CustomerName');



/**
 * Represents an exception that occurred while preparing a customer.
 *
 * @param {string} message Exception error message.
 * @constructor
 * @export
 */
bloombox.shop.CustomerException = function CustomerException(message) {
  this.message = message;
};


// -- Customer -- //
/**
 * Specifies a customer's name.
 *
 * @typedef {{firstName: string, lastName: string}}
 */
bloombox.shop.CustomerName;


/**
 * Specifies a customer attached to an order, who is requesting the order be
 * fulfilled.
 *
 * @param {bloombox.identity.Person} person The human who is this customer.
 * @param {string} foreignID Foreign system ID, for submitting the order (i.e.
 *                 Greenbits).
 * @throws {bloombox.shop.CustomerException} If params provided are invalid.
 * @implements {bloombox.util.Exportable<proto.opencannabis.commerce.Customer>}
 * @constructor
 * @export
 */
bloombox.shop.Customer = function Customer(person,
                                           foreignID) {
  // validate foreign ID
  if (!(typeof foreignID === 'string' && foreignID.length > 0))
    throw new bloombox.shop.CustomerException(
      'Invalid customer foreign ID. Must be a valid string over length 1.');

  /**
   * Human being who is this customer.
   *
   * @type {bloombox.identity.Person}
   * @public
   */
  this.person = person;

  /**
   * Foreign ID for this customer.
   *
   * @type {string}
   * @public
   */
  this.foreignId = foreignID;

  /**
   * User key for this customer.
   *
   * @type {?string}
   */
  this.userKey = null;
};


/**
 * Return the backing person information for this customer.
 *
 * @return {bloombox.identity.Person} Customer's personal information.
 * @export
 */
bloombox.shop.Customer.prototype.getPerson = function() {
  return this.person;
};


/**
 * Retrieve this user's foreign ID, i.e, the partner-scoped ID for this user.
 *
 * @return {string} Partner-level ID for this user account.
 * @export
 */
bloombox.shop.Customer.prototype.getForeignId = function() {
  return this.foreignId;
};


/**
 * Set this customer's user key value.
 *
 * @param {string} key User key to set.
 * @public
 */
bloombox.shop.Customer.prototype.setUserKey = function(key) {
  this.userKey = key;
};


/**
 * Get this customer's user key value, or `null` if it is unset.
 *
 * @return {?string} User key, if set.
 * @export
 */
bloombox.shop.Customer.prototype.getUserKey = function() {
  return this.userKey;
};


// noinspection JSUnusedGlobalSymbols
/**
 * Set the customer's phone number. In some cases, verifying a customer returns
 * a record that does not include a valid phone number. For submission of PICKUP
 * or DELIVERY orders, you can add the updated phone number via this method.
 *
 * @param {?string} phone Phone number to set, or `null` to clear it. Must be a
 *        valid E164-formatted telephone number.
 * @return {bloombox.shop.Customer} For chain-ability.
 * @throws {bloombox.shop.CustomerException} If the provided value is invalid.
 * @export
 */
bloombox.shop.Customer.prototype.setPhoneNumber = function(phone) {
  if (phone !== null && (phone[0] !== '+' ||
      phone.length < 5 ||
      phone.length > 16))
    throw new bloombox.shop.CustomerException(
      'Invalid phone number: ' + phone);
  this.person.contactInfo.phoneNumber = phone === null ? null : phone;
  return this;
};


/**
 * Return this customer's phone number, as reported by the underlying customer
 * contact information.
 *
 * @return {?string} Customer's phone number, or `null` if none is set.
 * @export
 */
bloombox.shop.Customer.prototype.getPhoneNumber = function() {
  return this.person.contactInfo.phoneNumber || null;
};


/**
 * Return this customer's email address, as reported by the underlying customer
 * contact information.
 *
 * @return {?string} Customer's email address, or `null` if none is set.
 * @export
 */
bloombox.shop.Customer.prototype.getEmailAddress = function() {
  return this.person.contactInfo.emailAddress || null;
};


/**
 * Build a customer object from a proto customer response.
 *
 * @param {Object} proto Protobuf object.
 * @return {bloombox.shop.Customer} Inflated customer object.
 * @throws {bloombox.shop.CustomerException} If the name, email, or foreign ID
 *         could not be resolved.
 * @public
 */
bloombox.shop.Customer.fromResponse = function(proto) {
  if (typeof proto !== 'object' || !proto)
    throw new bloombox.shop.CustomerException(
      'Failed to resolve customer for response.');
  if (!('customer' in proto))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve customer.');
  if (!('foreignId' in proto['customer']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve foreign ID.');
  if (!('person' in proto['customer']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve person.');
  if (!('name' in proto['customer']['person']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve person\'s name.');
  if (!('contact' in proto['customer']['person']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve contact info.');
  if (!('email' in proto['customer']['person']['contact']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve email spec.');
  if (!('address' in proto['customer']['person']['contact']['email']))
    throw new bloombox.shop.CustomerException(
      'Failed to resolve email address.');

  // decode user key, if present
  let userKey = /** @type {?string|undefined} */ (proto['customer']['userKey']);

  // decode phone number
  let phone = /** @type {?string} */ (
    (typeof proto['customer']['person']['contact']['phone'] === 'object' &&
      typeof (
        proto['customer']['person']['contact']['phone']['e164']) === 'string') ?
      proto['customer']['person']['contact']['phone']['e164'] : null);

  bloombox.logging.log('Resolved customer phone number from response.', {
    'phone': phone,
    'response': proto['customer']['person']['contact']['phone']
  });

  // decode street address
  let streetAddress = (
    typeof proto['customer']['person']['contact']['location'] === 'object' &&
      typeof (
      proto['customer']['person']['contact']['location']['address'] === 'object'
      ) ? bloombox.identity.StreetAddress.fromResponse((
        proto['customer']['person']['contact']['location']['address'])) : null);

  bloombox.logging.log('Resolved customer address from response.', {
    'address': streetAddress,
    'response': proto['customer']['person']['contact']['location']
  });

  // inflate contact info
  let contactInfo = new bloombox.identity.ContactInfo(
    proto['customer']['person']['contact']['email']['address'],
    phone,
    streetAddress);

  let dobData = /** @type {?} */ (proto['customer']['person']['dateOfBirth']);

  let dobValue = /** @type {?string} */ (null);
  if (typeof dobData === 'string') {
    // it's a raw ISO8601 date string
    dobValue = dobData;
  } else if (typeof dobData === 'object') {
    // it's an ISO8601-style string probably
    if (dobData['iso8601'])
      dobValue = dobData['iso8601'];
  }

  let person = new bloombox.identity.Person(
    proto['customer']['person']['name']['firstName'],
    proto['customer']['person']['name']['lastName'],
    contactInfo,
    dobValue);

  let customer = new bloombox.shop.Customer(
    person,
    proto['customer']['foreignId']);

  if (typeof userKey === 'string')
    customer.setUserKey(userKey);
  return customer;
};


/**
 * Export this customer to a proto we can use in an RPC.
 *
 * @return {proto.opencannabis.commerce.Customer} Customer proto.
 * @throws {bloombox.shop.CustomerException} If data is missing/invalid.
 * @public
 */
bloombox.shop.Customer.prototype.export = function() {
  let customer = new proto.opencannabis.commerce.Customer();

  // prep customer name
  let name = new proto.opencannabis.person.Name();
  name.setFirstName(this.person.name.getFirstName());
  name.setLastName(this.person.name.getLastName());

  let contactInfo = new proto.opencannabis.contact.ContactInfo();
  let contactLocation = new proto.opencannabis.geo.Location();
  let contactAddress = new proto.opencannabis.geo.Address();

  // prep street address, if available
  if (this.person.contactInfo.streetAddress !== null) {
    contactAddress.setFirstLine(
      this.person.contactInfo.streetAddress.firstLine);
    if (this.person.contactInfo.streetAddress.secondLine !== null)
      contactAddress.setSecondLine(
        /** @type {string} */ (
          this.person.contactInfo.streetAddress.secondLine));
    contactAddress.setCity(this.person.contactInfo.streetAddress.city);
    contactAddress.setState(this.person.contactInfo.streetAddress.state);
    contactAddress.setZipcode(this.person.contactInfo.streetAddress.zip);
    contactAddress.setCountry(this.person.contactInfo.streetAddress.country);
    contactLocation.setAddress(contactAddress);
    contactInfo.setLocation(contactLocation);
  }

  // prep contact info
  let emailAddress = new proto.opencannabis.contact.EmailAddress();

  // casting this because orders require an email address
  if (!(typeof this.person.contactInfo.emailAddress === 'string') ||
      (this.person.contactInfo.emailAddress.length < 3) ||
      (this.person.contactInfo.emailAddress.split('@').length !== 2))
    throw new bloombox.shop.CustomerException(
      'Must provide a valid email address.');
  emailAddress.setAddress(/** @type {string} */ (
    this.person.contactInfo.emailAddress));
  contactInfo.setEmail(emailAddress);

  // casting this because orders require a phone number
  if (this.person.contactInfo.phoneNumber === null) {
    throw new bloombox.shop.CustomerException(
      'Must provide a valid phone number.');
  }
  let phoneNumber = new proto.opencannabis.contact.PhoneNumber();
  phoneNumber.setE164(
    /** @type {string} */ (this.person.contactInfo.phoneNumber));
  contactInfo.setPhone(phoneNumber);

  // set foreign ID
  customer.setForeignId(this.foreignId);
  return customer;
};
