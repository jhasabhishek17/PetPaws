/**
 * PetPaws Role and Permission Helpers
 *
 * Supported Roles:
 * - 'buyer' (Retail Customer: adopts pets, purchases supplies, books vets/grooming)
 * - 'seller' (Certified Breeder: manages pet inventory, pet orders, breeder business)
 * - 'shopkeeper' (Product Merchant: manages pet supplies catalog, orders, shipping)
 * - 'vet' (Veterinarian: manages clinic, appointments, patient consults)
 * - 'groomer' (Spa & Grooming: manages salon appointments, spa ops)
 * - 'admin' (Platform Administrator: platform moderation, audits, overrides)
 * - null / undefined (Guest visitor: public browsing, guided auth)
 */

export const ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  SHOPKEEPER: 'shopkeeper',
  VET: 'vet',
  GROOMER: 'groomer',
  ADMIN: 'admin'
};

export const isCustomer = (user) => user?.role === ROLES.BUYER;
export const isAdmin = (user) => user?.role === ROLES.ADMIN;
export const isSeller = (user) => user?.role === ROLES.SELLER;
export const isShopkeeper = (user) => user?.role === ROLES.SHOPKEEPER;
export const isVet = (user) => user?.role === ROLES.VET;
export const isGroomer = (user) => user?.role === ROLES.GROOMER;

/**
 * Returns true if the user is a service or inventory provider (seller, shopkeeper, vet, groomer).
 * Providers have dedicated management portals and cannot perform customer purchases.
 */
export const isProvider = (user) =>
  Boolean(user && [ROLES.SELLER, ROLES.SHOPKEEPER, ROLES.VET, ROLES.GROOMER].includes(user.role));

/**
 * Check if the user is permitted to purchase physical marketplace products.
 * Backend constraint: req.user.role === 'buyer' || req.user.role === 'admin'
 * Guests return true here for browsing/initiating, with authentication enforced on action.
 */
export const canPurchaseProducts = (user) =>
  Boolean(!user || user.role === ROLES.BUYER || user.role === ROLES.ADMIN);

/**
 * Check if the user is permitted to adopt / place pet orders.
 * Backend constraint: req.user.role === 'buyer'
 * Guests return true for intent, with auth enforced before checkout.
 */
export const canAdoptPets = (user) =>
  Boolean(!user || user.role === ROLES.BUYER);

/**
 * Check if the user is permitted to book veterinary consultations or grooming sessions.
 * Backend constraint: req.user.role === 'buyer' || req.user.role === 'admin'
 */
export const canBookServices = (user) =>
  Boolean(!user || user.role === ROLES.BUYER || user.role === ROLES.ADMIN);

/**
 * Check if the user can manage pet listings.
 */
export const canManagePetListings = (user) =>
  Boolean(user && (user.role === ROLES.SELLER || user.role === ROLES.ADMIN));

/**
 * Check if the user has access to the Multi-Tenant SaaS Business Portal.
 */
export const canAccessSaaSPortal = (user) =>
  Boolean(user && [ROLES.SELLER, ROLES.SHOPKEEPER, ROLES.GROOMER, ROLES.VET, ROLES.ADMIN].includes(user.role));

/**
 * Check if the user has access to the Customer Buyer Dashboard & Wishlist.
 */
export const canAccessBuyerFeatures = (user) =>
  Boolean(user && (user.role === ROLES.BUYER || user.role === ROLES.ADMIN));
