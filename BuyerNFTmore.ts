// Import modules from libraries
import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// Initialize the lucid API
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Select buyer wallet
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./beneficiary.seed"));


// Function to read validator from plutus.json file
async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Public key for the buyer
const beneficiaryPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Read the validator and assign it to a variable
const validator = await readValidator();

// ---------------------------------------------------

// Read the contract address from the validator variable
const scriptAddress = lucid.utils.validatorToAddress(validator);


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

// NFT data to filter out UTxOs containing that NFT
const policyId1 = "e73f1a5e394786e6f0e24e25eaff203af107e6ab15ffa72e56c41210";
const assetName1 = "4e46542044454d4f";
const policyId2 = "d65f2d926936dd92e7f5a57645c86472774b24c2dcf15cdeefd509d9";
const assetName2 = "6e677579656e206b68616e68";
const policyId = [policyId1, policyId2];
const assetName = [assetName1, assetName2];


// Get the UTxO datum containing the NFT you want to buy

// Retrieve all UTxOs present on the contract address
const scriptUtxos = await lucid.utxosAt(scriptAddress);

let utxos = []

for (let i = 0; i < policyId.length; i++) {
    for (let u = 0; u < scriptUtxos.length; u++) {
        try {
            // Pour datum data into the temp variable of the current UTxO
            const temp = Data.from<Datum>(scriptUtxos[u].datum, Datum);

            // Check to see if that UTxO actually contains the NFT you want to buy?
            if (temp.policyId === policyId[i] && temp.assetName === assetName[i]) {
                utxos.push(scriptUtxos[u])
            }
        } catch (e) {
        }
    }
}

console.log(utxos)


// If no UTxO is selected, the program will stop
if (utxos.length === 0) {
    console.log("No redeemable utxo found. You need to wait a little longer...");
    Deno.exit(1);
}

let UTOut = []

for (let i = 0; i < utxos.length; i++) {
    UTOut.push(Data.from<Datum>(utxos[i].datum, Datum));
}
console.log(UTOut)

// The contract does not use a redeemer, but this is required so it is initialized empty
const redeemer = Data.void();

// The function unlocks the assets on the contract
async function unlock(utxos, UTOut, { from, using }): Promise<TxHash> {
    console.log(utxos);
    console.log(UTOut);

    // Initiate transaction
    let tx = await lucid
        .newTx();

    for (let i = 0; i < utxos.length; i++) {
        // Exchange fees need to be paid
        let exchange_fee = BigInt(parseInt(UTOut[i].price) * 1 / 100);
        tx = await tx
            .payToAddress("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz", { lovelace: UTOut[i].price })
            .payToAddress("addr_test1qqayue6h7fxemhdktj9w7cxsnxv40vm9q3f7temjr7606s3j0xykpud5ms6may9d6rf34mgwxqv75rj89zpfdftn0esq3pcfjg", { lovelace: exchange_fee })
            .payToAddress("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz", { lovelace: UTOut[i].royalties }); // Send money to buyer
    }
    tx = await tx
        .collectFrom(utxos, using)
        .attachSpendingValidator(from)
        .complete();

    console.log(1);

    // Sign the transaction
    let signedTx = await tx.sign().complete();

    // Send transactions to onchain
    return signedTx.submit();
}

// Execute the asset purchase transaction in the contract
const txUnlock = await unlock(utxos, UTOut, { from: validator, using: redeemer });
console.log(1);

// Waiting time until the transaction is confirmed on the Blockchain
await lucid.awaitTx(txUnlock);

console.log(`NFT recovered from the contract
    Tx ID: ${txUnlock}
    Redeemer: ${redeemer}
`);

