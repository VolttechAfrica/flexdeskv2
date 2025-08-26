export const responseMessage = {
    NotFound: {
        status: false,
        message: "The requested resource was not found",
        error: "Not Found",
    },

    Unauthorized: {
        status: false,
        message: "Unauthorized user, please contact Admin",
        error: "Unauthorized",
    },

    InvalidEmailOrPassword: {
        status: false,
        message: "Invalid credentials, please try again",
        error: "Unauthorized",
    },

    UserNotFound: {
        status: false,
        message: "User not found, try again",
        error: "Not Found",
    },

    UserAccountInactive: {
        status: false,
        message: "User account is inactive, please contact admin",
        error: "Unauthorized",
    },

    LoginSuccessful: {
        status: true,
        message: "Login was successful",
        error: null,
    },

    UserCreated: {
        status: true,
        message: "User created successfully",
        error: null,
    },

    UserUpdated: {
        status: true,
        message: "User updated successfully",
        error: null,
    },

    UserDeleted: {
        status: true,
        message: "User deleted successfully",
        error: null,
    },


    UserAlreadyExists: {
        status: false,
        message: "User already exists",
        error: "Conflict",
    },

    UserNotFoundError: {
        status: false,
        message: "User not found",
        error: "Not Found",
    },

    UserNotAuthorized: {
        status: false,
        message: "User not authorized",
        error: "Unauthorized",
    },

    UserNotActive: {
        status: false,
        message: "User account is inactive, please contact admin",
        error: "Unauthorized",
    },

    UserNotVerified: {
        status: false,
        message: "User account is not verified, please contact admin",
        error: "Unauthorized",
    },

    UserAlreadyVerified: {
        status: false,
        message: "User account is already verified",
        error: "Conflict",
    },

    UserNotFoundInDatabase: {
        status: false,
        message: "User not found in database",
        error: "Not Found",
    },

    InvalidEmail: {
        status: false,
        message: "Invalid email address",
        error: "Bad Request",
    },

    ClassAlreadyAssigned: {
        status: false,
        message: "Class already assigned to staff",
        error: "Conflict",
    },

    InternalServerError: {
        status: false,
        message: "Internal server error",
        error: "Internal Server Error",
    },

    FailedToCreateUser: {
        status: false,
        message: "Failed to create user",
        error: "Internal Server Error",
    },

    FailedToUpdateUser: {
        status: false,
        message: "Failed to update user information",
        error: "Internal Server Error",
    },
}