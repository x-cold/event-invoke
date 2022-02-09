module.exports = {

  mockProcessSend() {
    return jest.spyOn(process, 'send').mockImplementation(() => {});
  },

};
