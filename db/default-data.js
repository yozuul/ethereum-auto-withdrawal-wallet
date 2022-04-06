const addDays = (days) => {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return date
}

const defaultSettings = [
   {
      api_key: process.env.SERVER_API_KEY,
      latest_update: addDays(5),
   }
]

export { defaultSettings }