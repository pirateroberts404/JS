
/*
 * Copyright 2018, Bloombox, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Bloombox Products: Grow
 *
 * @fileoverview Enumerates product grow types.
 */

goog.require('proto.opencannabis.structs.Grow');

goog.provide('bloombox.product.Grow');


// -- Grows -- //
/**
 * Product grow types.
 *
 * @export
 * @enum {proto.opencannabis.structs.Grow}
 */
bloombox.product.Grow = {
  'GENERIC': proto.opencannabis.structs.Grow.GENERIC,
  'INDOOR': proto.opencannabis.structs.Grow.INDOOR,
  'GREENHOUSE': proto.opencannabis.structs.Grow.GREENHOUSE,
  'OUTDOOR': proto.opencannabis.structs.Grow.OUTDOOR
};
