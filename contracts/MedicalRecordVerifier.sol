// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedicalRecordVerifier
 * @dev On-chain notarization of MediVault encrypted medical report hashes and patient consent verification.
 */
contract MedicalRecordVerifier {
    struct NotarizedRecord {
        bytes32 documentHash;
        address patient;
        uint256 timestamp;
        string metadataURI;
        bool isNotarized;
    }

    struct ConsentGrant {
        address patient;
        address entity;
        uint256 expiresAt;
        bool active;
    }

    // Mapping from Document SHA-256 Hash to Notarized Record
    mapping(bytes32 => NotarizedRecord) public records;
    
    // Mapping from Patient => Entity => Consent Grant
    mapping(address => mapping(address => ConsentGrant)) public consents;

    // Events
    event RecordNotarized(bytes32 indexed documentHash, address indexed patient, uint256 timestamp, string metadataURI);
    event ConsentGranted(address indexed patient, address indexed entity, uint256 expiresAt);
    event ConsentRevoked(address indexed patient, address indexed entity);

    /**
     * @notice Notarizes a medical report SHA-256 hash on-chain.
     * @param documentHash SHA-256 hash of the medical report file
     * @param metadataURI Off-chain metadata reference URI
     */
    function notarizeRecord(bytes32 documentHash, string memory metadataURI) external {
        require(!records[documentHash].isNotarized, "Record already notarized on-chain");

        records[documentHash] = NotarizedRecord({
            documentHash: documentHash,
            patient: msg.sender,
            timestamp: block.timestamp,
            metadataURI: metadataURI,
            isNotarized: true
        });

        emit RecordNotarized(documentHash, msg.sender, block.timestamp, metadataURI);
    }

    /**
     * @notice Verifies if a medical record hash is notarized.
     * @param documentHash SHA-256 hash of the document
     */
    function verifyRecord(bytes32 documentHash) external view returns (
        bool isNotarized,
        address patient,
        uint256 timestamp,
        string memory metadataURI
    ) {
        NotarizedRecord memory rec = records[documentHash];
        return (rec.isNotarized, rec.patient, rec.timestamp, rec.metadataURI);
    }

    /**
     * @notice Grants data access consent to a doctor or hospital address.
     * @param entity Address of doctor or hospital
     * @param durationSeconds Validity period in seconds
     */
    function grantConsent(address entity, uint256 durationSeconds) external {
        require(entity != address(0), "Invalid entity address");
        uint256 expiresAt = block.timestamp + durationSeconds;

        consents[msg.sender][entity] = ConsentGrant({
            patient: msg.sender,
            entity: entity,
            expiresAt: expiresAt,
            active: true
        });

        emit ConsentGranted(msg.sender, entity, expiresAt);
    }

    /**
     * @notice Revokes data access consent from an entity.
     * @param entity Address of doctor or hospital
     */
    function revokeConsent(address entity) external {
        consents[msg.sender][entity].active = false;
        emit ConsentRevoked(msg.sender, entity);
    }

    /**
     * @notice Verifies if an entity has valid, active consent from a patient.
     * @param patient Patient wallet address
     * @param entity Doctor or hospital wallet address
     */
    function checkConsent(address patient, address entity) external view returns (bool) {
        ConsentGrant memory grant = consents[patient][entity];
        return (grant.active && grant.expiresAt > block.timestamp);
    }
}
