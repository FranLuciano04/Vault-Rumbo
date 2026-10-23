/* global jest */
// Mocks oficiales de los módulos nativos que no existen bajo Jest.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
