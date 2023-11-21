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
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// Create the lucid api
const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// Select wallet
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./owner.seed"));

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

// Public key of the seller
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Public key of the NFT creator
const authorPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz")
        .paymentCredential.hash;


// --------------------------------------------------------------------------

// initialize the Datum object
const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String,
    author: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

// The data needed for the datum field (Public key of the seller and author above)
const Price = 100000000n;
const royalties = BigInt(parseInt(Price) * 1 / 100);
const policyId = "f6d61e2b83e15ce8ca7645e21ea4e552cad719d36290d07b50477100";
const assetName = "44656d61726b6574";
const fee = royalties + BigInt(parseInt(Price) * 1 / 100);

// Pass data into datum
const datum = Data.to<Datum>(
    {
        policyId: policyId,
        assetName: assetName,
        seller: ownerPublicKeyHash,
        author: authorPublicKeyHash,
        price: Price,
        royalties: royalties,
    },
    Datum
);

// NFTs are for sale
const NFT = policyId + assetName;
console.log(NFT)

// Asset locking function
async function lock(NFT, fee, { into, datum }): Promise<TxHash> {
    // Read the contract address from the validator variable
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);

    // Create transaction
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { [NFT]: 1n, lovelace: fee }) // Submit NFT and floor + royalty fees to the contract
        .complete();

    // Sign transaction
    const signedTx = await tx.sign().complete();

    // Send transactions to onchain
    return signedTx.submit();
}

// Lock assets into contracts
const txLock = await lock(NFT, fee, { into: validator, datum: datum });

// Time until the transaction is confirmed on the Blockchain
await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);
