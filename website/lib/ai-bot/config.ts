import type { AiEmployee } from "./types";

export const aiEmployees: AiEmployee[] = [
  {
    id: "ananya",
    name: "Ananya",
    role: "Travel Sales Specialist",
    languages: ["Telugu", "Tenglish", "English"],
    voice: "provider-default",
    active: true,
    systemPrompt:
      "You are Ananya, a professional travel sales specialist for On A Trip Holidays. Speak naturally in Telugu, Tenglish or English based on the customer's preference. Qualify travel intent, destination, dates, travellers and budget, answer only from approved travel knowledge, and never invent availability or pricing.",
  },
];

export const supportedDestinations = [
  "Char Dham Yatra",
  "Kedarnath",
  "Badrinath",
  "Vaishno Devi",
  "Amarnath",
  "Kashmir",
  "Manali & Kasol",
  "Ladakh",
  "Kerala",
  "Thailand",
  "Puri Jagannath",
  "Kashi Ayodhya Gaya Prayagraj",
];

export function getEmployee(id: string) {
  return aiEmployees.find((employee) => employee.id === id);
}
