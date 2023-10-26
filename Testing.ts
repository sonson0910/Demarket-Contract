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
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { Buffer } from "https://deno.land/std@0.136.0/node/buffer.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

// const wallet = lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));
const wallet = lucid.selectWalletFromSeed(await Deno.readTextFile("./demarket.seed"));

let addr = C.Address.from_bech32(await lucid.wallet.address())
let base_addr = C.BaseAddress.from_address(addr)

// Extract stake credential               
let stake_cred = base_addr.stake_cred()
let payment_cred = base_addr.payment_cred()

// Log hex address
console.log("Stake credential: " + Buffer.from(stake_cred.to_keyhash().to_bytes().buffer).toString("hex"))
// 3061bacb0f06860c0b51cc3a5faf8965e476853462e0bc6768acba88
console.log("Payment credential: " + Buffer.from(payment_cred.to_keyhash().to_bytes().buffer).toString("hex"))
// 90c5b1c19f0a27145f500e62f088a27e88d3165331709e4ea53637b9


// Public key nguoi mua
const payment_credential = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential;

const stake_credential = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).stakeCredential

console.log(payment_credential)
// 3061bacb0f06860c0b51cc3a5faf8965e476853462e0bc6768acba88

console.log(stake_credential)

let address = lucid.utils.credentialToAddress(payment_credential, stake_credential)

console.log(address)