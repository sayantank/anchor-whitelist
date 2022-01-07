import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sigma } from "../target/types/sigma";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "js-sha3";

describe("sigma", () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sigma as Program<Sigma>;

  const counter = anchor.web3.Keypair.generate();
  let whitelist: anchor.web3.PublicKey = null;
  let whitelistBump: number = null;

  let user1 = anchor.web3.Keypair.generate();
  let user2 = anchor.web3.Keypair.generate();
  // user3 is provider.wallet

  let anon = anchor.web3.Keypair.generate();

  const tree = new MerkleTree(
    [
      user1.publicKey.toBuffer(),
      user2.publicKey.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    keccak256,
    { sort: true }
  );
  const root = tree.getRoot();
  console.log("Root:", root.toString("hex"));

  it("Initialize", async () => {
    [whitelist, whitelistBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("whitelist"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.rpc.initialize(whitelistBump, [...root], {
      accounts: {
        whitelist: whitelist,
        counter: counter.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [counter],
    });
    console.log("Your transaction signature", tx);
  });

  it("Valid Increment", async () => {
    // TODO
  });
});
