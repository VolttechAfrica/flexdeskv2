export const generateRegistrationNumber = async (schoolCode: string): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(2, 2); // Get the last two digits of the year
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Ensure month is always two digits
    const day = date.getDate().toString().padStart(2, '0'); // Ensure day is always two digits

    const randomNumber = Math.floor(Math.random() * 9000) + 1000; // Generate a four-digit random number

    const registrationNumber = `${schoolCode}${day}${month}${year}${randomNumber}`;

    return registrationNumber;
}