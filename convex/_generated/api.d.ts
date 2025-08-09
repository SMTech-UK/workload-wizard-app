/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as academicYears from "../academicYears.js";
import type * as audit from "../audit.js";
import type * as courses from "../courses.js";
import type * as featureFlags from "../featureFlags.js";
import type * as modules from "../modules.js";
import type * as organisationalRoles from "../organisationalRoles.js";
import type * as organisations from "../organisations.js";
import type * as permissions from "../permissions.js";
import type * as staff from "../staff.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  academicYears: typeof academicYears;
  audit: typeof audit;
  courses: typeof courses;
  featureFlags: typeof featureFlags;
  modules: typeof modules;
  organisationalRoles: typeof organisationalRoles;
  organisations: typeof organisations;
  permissions: typeof permissions;
  staff: typeof staff;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
