package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract is the main contract that holds all our functions
type SmartContract struct {
	contractapi.Contract
}

// Vendor is the shape of every vendor record stored on the blockchain
type Vendor struct {
	VendorID  string `json:"vendorID"`
	Name      string `json:"name"`
	Company   string `json:"company"`
	Certified bool   `json:"certified"`
	Timestamp string `json:"timestamp"`
}

// ComplianceRecord stores the result of every vendor submission
type ComplianceRecord struct {
	RecordID    string `json:"recordID"`
	VendorID    string `json:"vendorID"`
	SBOMHash    string `json:"sbomHash"`
	OPAResult   string `json:"opaResult"`
	AIRiskScore int    `json:"aiRiskScore"`
	Timestamp   string `json:"timestamp"`
}

// RegisterVendor saves a new vendor permanently to the blockchain
func (s *SmartContract) RegisterVendor(
	ctx contractapi.TransactionContextInterface,
	vendorID string,
	name string,
	company string,
	certified bool,
) error {

	// First check — does this vendor already exist?
	existing, err := ctx.GetStub().GetState(vendorID)
	if err != nil {
		return fmt.Errorf("failed to read from ledger: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("vendor %s already exists on the ledger", vendorID)
	}

	// Build the vendor object with all their details
	vendor := Vendor{
		VendorID:  vendorID,
		Name:      name,
		Company:   company,
		Certified: certified,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Convert the vendor object to JSON so the blockchain can store it
	vendorJSON, err := json.Marshal(vendor)
	if err != nil {
		return fmt.Errorf("failed to convert vendor to JSON: %v", err)
	}

	// PutState = write to the blockchain ledger permanently
	return ctx.GetStub().PutState(vendorID, vendorJSON)
}

// QueryVendor looks up a vendor from the blockchain by their ID
func (s *SmartContract) QueryVendor(
	ctx contractapi.TransactionContextInterface,
	vendorID string,
) (*Vendor, error) {

	// GetState = read from the blockchain ledger
	vendorJSON, err := ctx.GetStub().GetState(vendorID)
	if err != nil {
		return nil, fmt.Errorf("failed to read vendor %s: %v", vendorID, err)
	}
	if vendorJSON == nil {
		return nil, fmt.Errorf("vendor %s does not exist", vendorID)
	}

	// Convert the stored JSON back into a Vendor object
	var vendor Vendor
	err = json.Unmarshal(vendorJSON, &vendor)
	if err != nil {
		return nil, fmt.Errorf("failed to parse vendor data: %v", err)
	}

	return &vendor, nil
}

// RecordCompliance saves a pass/fail compliance result to the blockchain
func (s *SmartContract) RecordCompliance(
	ctx contractapi.TransactionContextInterface,
	recordID string,
	vendorID string,
	sbomHash string,
	opaResult string,
	aiRiskScore int,
) error {

	record := ComplianceRecord{
		RecordID:    recordID,
		VendorID:    vendorID,
		SBOMHash:    sbomHash,
		OPAResult:   opaResult,
		AIRiskScore: aiRiskScore,
		Timestamp:   time.Now().Format(time.RFC3339),
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to convert record to JSON: %v", err)
	}

	// Store using recordID as the key so each submission has its own entry
	return ctx.GetStub().PutState(recordID, recordJSON)
}

// GetAuditHistory returns the full history of changes for a given key
func (s *SmartContract) GetAuditHistory(
	ctx contractapi.TransactionContextInterface,
	key string,
) (string, error) {

	// GetHistoryForKey returns every version of this entry ever written
	iterator, err := ctx.GetStub().GetHistoryForKey(key)
	if err != nil {
		return "", fmt.Errorf("failed to get history for %s: %v", key, err)
	}
	defer iterator.Close()

	var history []map[string]interface{}

	for iterator.HasNext() {
		entry, err := iterator.Next()
		if err != nil {
			return "", err
		}

		record := map[string]interface{}{
			"txID":      entry.TxId,
			"timestamp": entry.Timestamp.String(),
			"isDeleted": entry.IsDelete,
			"value":     string(entry.Value),
		}
		history = append(history, record)
	}

	historyJSON, err := json.Marshal(history)
	if err != nil {
		return "", err
	}

	return string(historyJSON), nil
}

// Purchase stores a customer purchase transaction on the blockchain
type Purchase struct {
	PurchaseID string `json:"purchaseID"`
	CustomerID string `json:"customerID"`
	ProductID  string `json:"productID"`
	VendorID   string `json:"vendorID"`
	Amount     string `json:"amount"`
	Timestamp  string `json:"timestamp"`
}

// RecordPurchase saves a customer purchase permanently to the blockchain
func (s *SmartContract) RecordPurchase(
	ctx contractapi.TransactionContextInterface,
	purchaseID string,
	customerID string,
	productID string,
	vendorID string,
	amount string,
) error {

	purchase := Purchase{
		PurchaseID: purchaseID,
		CustomerID: customerID,
		ProductID:  productID,
		VendorID:   vendorID,
		Amount:     amount,
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	purchaseJSON, err := json.Marshal(purchase)
	if err != nil {
		return fmt.Errorf("failed to convert purchase to JSON: %v", err)
	}

	return ctx.GetStub().PutState(purchaseID, purchaseJSON)
}

// QueryPurchase retrieves a purchase record from the blockchain by its ID
func (s *SmartContract) QueryPurchase(
	ctx contractapi.TransactionContextInterface,
	purchaseID string,
) (*Purchase, error) {

	purchaseJSON, err := ctx.GetStub().GetState(purchaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to read purchase %s: %v", purchaseID, err)
	}
	if purchaseJSON == nil {
		return nil, fmt.Errorf("purchase %s does not exist", purchaseID)
	}

	var purchase Purchase
	err = json.Unmarshal(purchaseJSON, &purchase)
	if err != nil {
		return nil, fmt.Errorf("failed to parse purchase data: %v", err)
	}

	return &purchase, nil
}

// main is the entry point — this starts the chaincode
func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating VendorChain chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting VendorChain chaincode: %v\n", err)
	}
}
