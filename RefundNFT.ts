// import modules from libraries
import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
} from "https://deno.land/x/lucid@0.8.3/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// Create the lucid api
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Sellect wallet of seller NFT
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

// Public key of the seller
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Function to read validator from plutus.json file
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Read the validator and assign it to a variable
const validator = await readValidator();

// ---------------------------------------------------
// Read the contract address from the validator variable
const scriptAddress = lucid.utils.validatorToAddress(validator);

// we get all the UTXOs sitting at the script address
const scriptUtxos = await lucid.utxosAt(scriptAddress);

// Initialize Datum object
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// NFT data to filter out UTxO containing the NFT to be retrieved
const policyId = "d8db13a077b4fd63b5560e9cea7e39f0b11a67eeb89f5e3df9a45d0a";
const assetName = "4e46542044454d4f";

// Get the UTxO datum containing the NFT you want to buy
let UTOut;

// Filter out UTxOs containing NFTs to purchase
const utxos = scriptUtxos.filter((utxo) => {
    try {
        // Pour datum data into the temp variable of the current UTxO
        const temp = Data.from<Datum>(utxo.datum, Datum);

        // Check to see if UTxO is currently available as an NFT that can be purchased? Check to see if the UTxO actually contains the NFT you want to buy
        if (temp.policyId === policyId && temp.assetName === assetName) {
            UTOut = Data.from<Datum>(utxo.datum, Datum); // get the datum of that UTxO into a variable
            return true; // UTxO is getted
        }

        return false; // That UTxO is not selected 
    } catch (e) {
        return false; // That UTxO is not selected
    }
});

console.log(UTOut)

// If no UTxO is selected, the program will be used
if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
}


// The contract does not use a redeemer, but this is required so it is initialized empty
const redeemer = Data.empty();

// function unlocks assets onto the contract
async function unlock(utxos, { from, using }): Promise<TxHash> {
    const tx = await lucid // Initialize transaction
        .newTx()
        .collectFrom(utxos, using) // Consume UTxO (retrieve NFTs on the contract to the wallet)
        .addSigner(await lucid.wallet.address()) // Add a signature from the seller
        .attachSpendingValidator(from) // Refers to the contract, if confirmed all output will be executed
        .complete();

    // Sign transaction
    const signedTx = await tx
        .sign()
        .complete();
    // Send transaction to onchain
    return signedTx.submit();
}

// Execution of taking back the sold property in the contract
const txUnlock = await unlock(utxos, { from: validator, using: redeemer });

// Time until the transaction is confirmed on the blockchain
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

