// {
//  _status: fulfilled|pending|rejected,
//  _data: sdsd,
//  _bad_data: saaad,
//  then: (_data) => {},
//  catch: (_bad_data) => {}
// }

// const randomizer = () => {
//   const min = 1;
//   const max = 9;
//   let rand = min + Math.random() * (max + 1 - min);
//   return Math.floor(rand);
// };

// const promise1 = Promise.reject('234');

// const promise1 = new Promise((resolve, reject) => {
//   const result = randomizer();
//   // if (result < 5) {
//   //   resolve('cool');
//   // } else {
//   //   reject('baaad');
//   // }
// });

// promise1
//   .then((result) => console.log(result))
//   .catch((message) => console.log(message));

const func = async () => {
  await 123;
  console.log('func');
};

const result = func();

console.log(result);
