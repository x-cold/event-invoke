const { arrayMax } = require('../lib/utils');

test('arrayMax', () => {
  const arr = [1, 4, 2, 3, 5];
  expect(arrayMax(arr)).toBe(5);
});
