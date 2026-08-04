'use strict';

const { connect, signers } = require('@hyperledger/fabric-gateway');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const channelName = process.env.FABRIC_CHANNEL || 'mychannel';
const chaincodeName = process.env.FABRIC_CHAINCODE || 'vendorchain';
const mspId = process.env.FABRIC_MSP_ID || 'Org1MSP';
const peerEndpoint = process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

// Path to the Fabric test network crypto materials in WSL
const testNetworkPath = path.join(os.homedir(), 'fabric-samples', 'test-network');
const org1Path = path.join(
  testNetworkPath,
  'organizations',
  'peerOrganizations',
  'org1.example.com'
);

async function newGrpcConnection() {
  const tlsCertPath = path.join(
    org1Path,
    'peers',
    'peer0.org1.example.com',
    'tls',
    'ca.crt'
  );

  if (!fs.existsSync(tlsCertPath)) {
    throw new Error(
      `TLS cert not found at ${tlsCertPath}\n` +
      `Make sure the Fabric test network is running:\n` +
      `  cd ~/fabric-samples/test-network\n` +
      `  ./network.sh up createChannel -ca`
    );
  }

  const tlsCert = fs.readFileSync(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsCert);

  return new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': peerHostAlias
  });
}

async function newIdentity() {
  const certPath = path.join(
    org1Path,
    'users',
    'User1@org1.example.com',
    'msp',
    'signcerts',
    'User1@org1.example.com-cert.pem'
  );

  if (!fs.existsSync(certPath)) {
    throw new Error(`User cert not found at ${certPath}`);
  }

  const credentials = fs.readFileSync(certPath);
  return { mspId, credentials };
}

async function newSigner() {
  const keyStorePath = path.join(
    org1Path,
    'users',
    'User1@org1.example.com',
    'msp',
    'keystore'
  );

  if (!fs.existsSync(keyStorePath)) {
    throw new Error(`Keystore not found at ${keyStorePath}`);
  }

  const files = fs.readdirSync(keyStorePath);
  if (files.length === 0) {
    throw new Error('No private key found in keystore directory');
  }

  const keyPath = path.join(keyStorePath, files[0]);
  const privateKeyPem = fs.readFileSync(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);

  return signers.newPrivateKeySigner(privateKey);
}

async function connectToFabric() {
  const client = await newGrpcConnection();

  const gateway = connect({
    client,
    identity: await newIdentity(),
    signer: await newSigner(),
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });

  return { gateway, client };
}

module.exports = { connectToFabric, channelName, chaincodeName };
