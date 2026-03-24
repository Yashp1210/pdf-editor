export const STATIONS = [
  "SURAT (ST)",
  "AHMEDABAD JN (ADI)",
  "BILIMORA (BIM)",
  "VALSAD (BL)",
  "VADODARA (BRC)",
  "VAPI (VAPI)",
  "BHILAD (BLD)",
  "BHARUCH JN (BH)",
];

export const DISTANCES = {
  "SURAT (ST)|AHMEDABAD JN (ADI)": 229,
  "SURAT (ST)|BILIMORA (BIM)": 45,
  "SURAT (ST)|VALSAD (BL)": 68,
  "SURAT (ST)|VADODARA (BRC)": 130,
  "SURAT (ST)|VAPI (VAPI)": 95,
  "SURAT (ST)|BHILAD (BLD)": 107,
  "SURAT (ST)|BHARUCH JN (BH)": 60,
};

export const TRAINS = {
  "SURAT (ST)|VAPI (VAPI)": [
    {
      name: "12932/MMCT DOUBLE DECKER",
      departure: "09:07",
      arrival: "10:20",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "DOUBLE_DECKER",
    },
    {
      name: "22930/Dahanu Road SF Express",
      departure: "08:35",
      arrival: "09:53",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
  ],

  "VAPI (VAPI)|SURAT (ST)": [
    {
      name: "12931/ADI DOUBLE DECKER",
      departure: "16:28",
      arrival: "17:52",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "DOUBLE_DECKER",
    },
    {
      name: "20901/GNC VANDE BHARAT",
      departure: "07:53",
      arrival: "09:05",
      class: "CHAIR CAR (CC)",
      fare: 700,
      seatType: "VANDE_BHARAT",
    },
    {
      name: "12921/FLYING RANEE",
      departure: "20:08",
      arrival: "22:35",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
  ],

  "SURAT (ST)|BILIMORA (BIM)": [
    {
      name: "20908/SAYAJI NAGARI SUPERFAST EXP",
      departure: "09:55",
      arrival: "10:38",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
    {
      name: "22930/Dahanu Road SF Express",
      departure: "08:35",
      arrival: "09:13",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
  ],

  "SURAT (ST)|AHMEDABAD JN (ADI)": [
    {
      name: "20960/VDG VALSAD SUP",
      departure: "06:40",
      arrival: "10:10",
      class: "CHAIR CAR (CC)",
      fare: 450,
      seatType: "CC_STANDARD",
    },
  ],

  "AHMEDABAD JN (ADI)|SURAT (ST)": [
    {
      name: "82902/IRCTC TEJAS EXP",
      departure: "06:35",
      arrival: "09:19",
      class: "CHAIR CAR (CC)",
      fare: 1200,
      seatType: "CC_STANDARD",
    },
  ],

  "SURAT (ST)|BHILAD (BLD)": [
    {
      name: "22930/Dahanu Road SF Express",
      departure: "08:32",
      arrival: "10:03",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
  ],

  "SURAT (ST)|VADODARA (BRC)": [
    {
      name: "12834/AHMEDABAD SF Express",
      departure: "08:00",
      arrival: "09:34",
      class: "CHAIR CAR (CC)",
      fare: 305,
      seatType: "CC_STANDARD",
    },
  ],

  "VADODARA (BRC)|SURAT (ST)": [
    {
      name: "12905/SHALIMAR SF Express",
      departure: "17:26",
      arrival: "21:15",
      class: "AC 3 TIER (3A)",
      fare: 550,
      seatType: "AC_3_TIER",
    },
  ],

  "BHARUCH JN (BH)|SURAT (ST)": [
    {
      name: "12844/PURI SF EXPRESS",
      departure: "21:44",
      arrival: "22:50",
      class: "AC 3 TIER (3A)",
      fare: 550,
      seatType: "AC_3_TIER",
    },
  ],
};
