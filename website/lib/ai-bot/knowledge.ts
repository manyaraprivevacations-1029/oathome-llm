export type KnowledgeItem = {
  id: string;
  title: string;
  category: "destination" | "package" | "policy" | "faq";
  status: "approved" | "draft";
  content: string;
};

export const knowledgeItems: KnowledgeItem[] = [
  {
    id: "kb-char-dham",
    title: "Char Dham Yatra 2026 - 10 nights / 11 days",
    category: "package",
    status: "approved",
    content: `ON A TRIP HOLIDAYS - CHAR DHAM YATRA 2026
Package duration: 10 nights / 11 days. Start and end: Delhi. The brochure lists origins for customers travelling from Hyderabad, Vijayawada, Visakhapatnam and Bangalore; train-ticket booking assistance is offered. Ask the customer to confirm their intended origin.

PACKAGE PRICE IN THE BROCHURE
Adult: ₹23,499 per person plus 5% GST (brochure shows a normal price of ₹29,999 and a ₹6,500 offer discount).
Children under 5: free.
Children aged 5-11: ₹15,399 plus 5% GST.
Age 11 and above: charged as an adult.
The brochure labels this a seasonal/Dussehra offer. Treat these as brochure prices. Do not add offer-validity or final-total caveats to routine answers; if the customer clearly agrees to book, say you have noted the request and will confirm with the travel team and update them.

BROCHURE DEPARTURE DATES FROM DELHI - 2026
August: 17, 22, 27.
September: 2, 5, 9, 14, 16, 20, 24, 27, 30.
October: 1, 5, 15, 20, 22, 26, 30.
These are dates printed in the brochure, not live seat inventory. Never say a date has seats or is sold out without confirmation from the travel team.

ROUTE AND NIGHT STAYS
Delhi → Haridwar (1 night) → Lakhamandal (2 nights) → Uttarkashi (2 nights) → Sonprayag/Sitapur (2 nights) → Kedarnath camp (1 night) → Badrinath/Joshimath (1 night) → Chamoli or Haridwar (1 night) → Delhi.
The yatra covers Yamunotri, Gangotri, Kedarnath and Badrinath. Other listed highlights include Har Ki Pauri Ganga Aarti, Lakhamandal Shiva Temple, Kashi Vishwanath Temple in Uttarkashi, Mana Village, Vyas Gufa, Ganesh Gufa, Charan Paduka, Bhimpul, the Saraswati river source, and Panch Prayag: Devprayag, Rudraprayag, Karnaprayag, Nandaprayag and Vishnuprayag. Dhari Devi Temple is listed en route.

DAY-BY-DAY ITINERARY
Day 1: Pick-up in Delhi and drive to Haridwar (about 250 km / 7 hours). Visit Har Ki Pauri and attend Ganga Aarti. Dinner and overnight in Haridwar.
Day 2: Haridwar to Lakhamandal (about 180 km / 7 hours). Visit Lakhamandal Shiva Temple. Breakfast and dinner; overnight in Lakhamandal.
Day 3: Lakhamandal to Janki Chatti/Yamunotri (about 70 km / 3 hours by road, then a 6 km trek each way). Early departure around 4:00 AM. Trek, pony or doli from Janki Chatti is at the traveller's own cost. Visit Yamunotri and Jamnabai Kund, return to Lakhamandal. Breakfast and dinner.
Day 4: Lakhamandal to Uttarkashi (about 100 km / 5 hours). Visit Kashi Vishwanath Temple. Breakfast and dinner; overnight in Uttarkashi.
Day 5: Uttarkashi to Gangotri and back (about 100 km each way). Early departure around 4:00-5:00 AM, visit Gangotri and return to Uttarkashi. Breakfast and dinner.
Day 6: Uttarkashi to Sonprayag or Sitapur (about 230 km / 10 hours). Breakfast and dinner; overnight there.
Day 7: Sonprayag/Sitapur to Kedarnath. Transfer to Gaurikund by government shared vehicle at the traveller's own cost, then trek about 22 km. Walking, pony or doli options; pony/doli costs are extra. Visit Shankaracharya Samadhi. Overnight in an On A Trip camp at Kedarnath; breakfast and dinner. Camp accommodation has common washrooms and no private rooms.
Day 8: Early Kedarnath darshan, then trek down about 22 km to Sonprayag/Sitapur. Breakfast and dinner; overnight there. Kedarnath cloakroom luggage storage is at the traveller's cost (brochure states ₹100).
Day 9: Sonprayag/Sitapur to Badrinath or Joshimath (about 230 km / 10 hours). Breakfast and dinner; overnight at Badrinath/Joshimath.
Day 10: Badrinath darshan and Tapt Kund, then visit Mana Village and listed nearby sites. Overnight in Chamoli or Haridwar. Breakfast and dinner.
Day 11: Depart Chamoli/Haridwar for Delhi, with a listed approximate 7:00 AM departure. Delhi drop and onward train journey. Breakfast.

INCLUSIONS LISTED
Round-trip sleeper-class train reservation, subject to availability, plus booking assistance; group-sharing accommodation (usually 3-4 sharing); 10 breakfasts and 10 dinners; sightseeing and darshan; transport, toll, parking, fuel, transport taxes and driver allowance; virtual travel manager advertised 24x7; and travel insurance (brochure advertises coverage worth ₹5 lakh; confirm policy terms and eligibility). AC is stated only for the Delhi-Haridwar portion and Haridwar hotel; hill transport and other hotels are non-AC. The brochure promotes South Indian vegetarian dinners and Telugu-speaking group travel.

EXTRA COSTS AND CONDITIONS
A double-sharing upgrade costs an extra ₹3,000 per person for 8 nights only; Kedarnath and Badrinath remain group-sharing for 2 nights.
Private-car comfort/vehicle upgrade is listed at an extra ₹4,000 per person. Brochure vehicle examples: sedan for 4 passengers, Ertiga for 6, Innova for 7, Traveller/SUV for 12-17; actual vehicle depends on group size.
Pony/doli, Kedarnath hot water, personal expenses, tips, heater charges and activities are excluded. Costs caused by landslides, roadblocks or other natural calamities are charged directly to the traveller. Packed breakfast is provided for early departures. Pickup points are decided based on group convenience. The company says it may modify the itinerary without prior notice. Tempo seating is by mutual understanding.
`,
  },
  { id:"kb-kedarnath", title:"Kedarnath & Badrinath", category:"package", status:"approved", content:"Approved Kedarnath and Badrinath travel information." },
  { id:"kb-vaishno", title:"Vaishno Devi & Amarnath", category:"destination", status:"approved", content:"Approved pilgrimage information." },
  { id:"kb-kashmir", title:"Kashmir", category:"destination", status:"approved", content:"Approved Kashmir destination information." },
  { id:"kb-manali", title:"Manali & Kasol", category:"destination", status:"approved", content:"Approved Manali and Kasol information." },
  { id:"kb-ladakh", title:"Leh Ladakh", category:"destination", status:"approved", content:"Approved Ladakh information." },
  { id:"kb-kerala", title:"Kerala", category:"destination", status:"approved", content:"Approved Kerala information." },
  { id:"kb-thailand", title:"Thailand", category:"destination", status:"approved", content:"Approved Thailand information." },
  { id:"kb-puri", title:"Puri Jagannath", category:"destination", status:"approved", content:"Approved Puri Jagannath information." },
  { id:"kb-kashi", title:"Kashi Ayodhya Gaya Prayagraj", category:"destination", status:"approved", content:"Approved pilgrimage information." },
];
