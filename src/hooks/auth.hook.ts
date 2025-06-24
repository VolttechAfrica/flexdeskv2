import { FastifyReply, FastifyRequest } from "fastify";
import { HttpStatusCode } from "axios";

export default async function authorize(permissionName: string){
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      const {permissions} = user;

      const hasPermission = permissions.includes(permissionName) || permissions.includes("assign_superadmin");

      if (!hasPermission) {
        return reply.code(HttpStatusCode.Forbidden).send({ message: "Forbidden: Permission denied" });
      }
    } catch {
      return reply.code(HttpStatusCode.Unauthorized).send({ message: "Unauthorized" });
    }
  };
}


