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

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

const wallet = lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

const validator = await readValidator();

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

const beneficiaryPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1vqzm7agsc3hmzzcmakfd77h3eag2xnh3gneagcs8n8nvusc5nz6zw")
        .paymentCredential.hash;
// --------------------------------------------------------------------------


const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String, 
    buyer: Data.String,
    price: Data.BigInt,
    royalties: Data.BigInt,
});

type Datum = Data.Static<typeof Datum>;

const Price = 100000000n;
const royalties = BigInt(parseInt(Price) * 1 / 100);

const policyId = "84bbdb23ad326e42ee70540ec8c33a5b433c2e1c54f8a0bea3c45ac0";
const assetName = "000de14061696b656e";

const datum = Data.to<Datum>(
    {
        policyId: policyId,
        assetName: assetName,
        seller: ownerPublicKeyHash, // our own wallet verification key hash
        buyer: beneficiaryPublicKeyHash,
        price: Price,
        royalties: royalties,
    },
    Datum
);

const NFT = policyId + assetName;
console.log(NFT)

const txLock = await lock(NFT, { into: validator, datum: datum });

await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);

// --- Supporting functions

async function lock(NFT, { into, datum }): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { [NFT]: 1n })
        .complete();

    const signedTx = await tx.sign().complete(); 

    return signedTx.submit(); 
}

