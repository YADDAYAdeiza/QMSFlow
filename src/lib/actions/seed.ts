"use server"

import { db } from "@/db";
import { users } from "@/db/schema";

export async function seedStaff() {
  const divisions = ["VMD", "PAD", "AFPD", "IRSD"];
  const staffToCreate = [];

  for (const div of divisions) {
    for (let i = 1; i <= 4; i++) {
      staffToCreate.push({
        name: `${div} Staff ${i}`,
        email: `${div.toLowerCase()}_staff${i}@agency.gov`,
        role: "Staff",
        division: div,
      });
    }
  }

  // Insert all 16 staff members
  await db.insert(users).values(staffToCreate);
  
  return { success: true, message: "16 Staff members seeded successfully." };
}