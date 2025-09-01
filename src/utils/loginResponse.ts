import { AuthError } from "./errorhandler.js"
import { HttpStatusCode } from "axios"
import { responseMessage } from "./responseMessage.js";


const UserResponse = async (data: any, token?: string) => {
  if (!data) throw new AuthError('Can not return empty object', HttpStatusCode.BadRequest);

  return {
    status: true,
    message: responseMessage.LoginSuccessful.message,
    token: token || '',
    IsFirstTimeLogin: !!data?.firstTimeLogin,
    data: {
      staffId: data?.id,
      email: data?.email,
      firstName: data?.firstName,
      otherName: data?.otherName,
      lastName: data?.lastName,
      status: data?.status,
      role: data?.roleId,
      profilePicture: data?.profile?.profilePicture,
      dateOfBirth: data?.profile?.dateOfBirth,
      gender: data?.profile?.gender,
      phoneNumber: data?.profile?.phoneNumber,
      address: data?.profile?.address,
      state: data?.profile?.state,
      city: data?.profile?.city,
      lga: data?.profile?.lga,
    },
    schoolInformation: data?.school,
    staff_class: {
      classId: data?.assignedClasses?.classId,
      classArmId: data?.assignedClasses?.classArmId,
    },
    profile: data?.profile,
  };
};

export default UserResponse;