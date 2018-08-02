export const imgAlts = [
  "Fancy crowded fancy restaurant.",
  "Sliced pizza on a plate.",
  "An empty, spacious restaurant.",
  "An outside picture of Katz's restaurant.",
  "Cozy american burger place, with lots of customers.",
  "An American, family-friendly burger place.",
  "An outside photo of an alternete style burger place.",
  "Restaurant called the dutch.",
  "Asias food restaurant with young customers enjoying their dinner.",
  "Modernish but vintage place, where girls chat most often."
];

export const putFetch = (url, data) => fetch(
  url,
  {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    }
  }
).then(res => {
  res.json
}).catch(err => console.log(err))
