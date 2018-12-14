export default {
  createAccountArgs: (args) => {
    const _args = {
      domain: "protofire.aragonid.eth",
      name: "Protofire",
      address: "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7",
      role: "Organization"
    }
    return Object.assign({}, _args, args)
  },

  createInitialAccounts: () => {
    return [
      {
        domain: "protofire.aragonid.eth",
        name: "Protofire",
        address: "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7",
        role: "Organization"
      }
    ]
  }
}
