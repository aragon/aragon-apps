export function getTimeBucket(currentDate, startDate, duration, numSlices) {
  const timeSlice = duration / numSlices;
  return Math.floor((currentDate - startDate) / timeSlice);
}
