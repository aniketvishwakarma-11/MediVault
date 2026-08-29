import { getAuthHeaders } from "./auth-token";
import { AbhaProfileData, DigiLockerDoc } from "@/types/government";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://medivault-653s.onrender.com";

export const GovernmentAPI = {
  /**
   * 1. Request OTP for ABHA generation (Aadhaar or Mobile)
   */
  async generateOtp(idType: "AADHAAR_OTP" | "MOBILE_OTP", idNumber: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/abha/generate-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ idType, idNumber }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Failed to generate ABHA OTP.");
    }
    return json.data as {
      transactionId: string;
      idType: string;
      maskedId: string;
      expiresInSeconds: number;
      mode: string;
      hint?: string;
    };
  },

  /**
   * 2. Verify OTP & generate verified ABHA credentials
   */
  async verifyOtp(transactionId: string, otp: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/abha/verify-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ transactionId, otp }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Invalid OTP or verification failed.");
    }
    return json.data as {
      abhaNumber: string;
      abhaAddress: string;
      abhaStatus: "ACTIVE";
      isGovVerified: boolean;
      kycDetails: any;
    };
  },

  /**
   * 3. Link Existing 14-digit ABHA Number or ABHA Address
   */
  async linkExisting(abhaInput: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/abha/link-existing`, {
      method: "POST",
      headers,
      body: JSON.stringify({ abhaInput }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Failed to link existing ABHA ID.");
    }
    return json.data as {
      abhaNumber: string;
      abhaAddress: string;
      abhaStatus: "ACTIVE";
      isGovVerified: boolean;
      kycDetails: any;
    };
  },

  /**
   * 4. Retrieve Current User's ABHA Profile & Verification
   */
  async getProfile(): Promise<AbhaProfileData> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/abha/profile`, {
      method: "GET",
      headers,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Failed to fetch ABHA profile.");
    }
    return json.data as AbhaProfileData;
  },

  /**
   * 5. Unlink ABHA
   */
  async unlink(): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/abha/unlink`, {
      method: "POST",
      headers,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Failed to unlink ABHA ID.");
    }
    return json.data;
  },

  /**
   * 6. Import verified health credentials from DigiLocker
   */
  async importDigiLocker(
    docTypes: string[],
    aadhaarOrMobile?: string,
    pin?: string
  ): Promise<{ importedCount: number; documents: DigiLockerDoc[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/government/digilocker/import`, {
      method: "POST",
      headers,
      body: JSON.stringify({ docTypes, aadhaarOrMobile, pin }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || "Failed to import documents from DigiLocker.");
    }
    return json.data;
  },
};
