export function generateBookingDateFromStart(startDateString) {
  if (!startDateString) return "";

  const match = startDateString.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return "";

  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  const year = parseInt(match[3], 10);

  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const month = months[monthStr];
  if (month === undefined) return "";

  const startDate = new Date(year, month, day);

  // 1 day before
  startDate.setDate(startDate.getDate() - 1);

  // Random hour between 10 AM and 10 PM
  const randomHour = Math.floor(Math.random() * 13) + 10; // 10–22
  const randomMinute = Math.floor(Math.random() * 60);
  const randomSecond = Math.floor(Math.random() * 60);

  startDate.setHours(randomHour, randomMinute, randomSecond);

  const formattedDate = startDate
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");

  const formattedTime = startDate.toTimeString().split(" ")[0];

  return `${formattedDate} ${formattedTime} HRS`;
}
