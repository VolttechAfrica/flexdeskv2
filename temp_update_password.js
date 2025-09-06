// Updated updateUserPassword method
async updateUserPassword(userId: string, password: string): Promise<boolean> {
  try {
    // First, try to find the login record by checking all possible user types
    const loginRecord = await this.prisma.login.findFirst({
      where: {
        OR: [
          { staffId: userId },
          { parentId: userId },
          { studentId: userId }
        ]
      }
    });

    if (!loginRecord) {
      return false; // User not found
    }

    // Update the password based on which user type was found
    await this.prisma.login.update({
      where: { id: loginRecord.id },
      data: { password },
    });

    return true;
  } catch (error) {
    console.error('Error updating user password:', error);
    return false;
  }
}
