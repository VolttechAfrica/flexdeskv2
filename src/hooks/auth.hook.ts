import { FastifyReply, FastifyRequest } from "fastify";
import { HttpStatusCode } from "axios";
import { UserError } from "../utils/errorhandler.js";

export default async function authorize(permissionName: string){
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      const {permissions} = user;

      const hasPermission = permissions.includes(permissionName) || permissions.includes("assign_superadmin");

      if (!hasPermission) {
        throw new UserError("Forbidden: Permission denied", HttpStatusCode.Forbidden);
      }
    } catch (err: any) {
      throw err;
    }
  };
}


