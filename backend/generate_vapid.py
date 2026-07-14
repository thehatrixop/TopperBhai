from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64
import os
from pathlib import Path

def generate_vapid_keys():
    # Generate SECP256R1 (NIST P-256) curve key pair
    private_key = ec.generate_private_key(ec.SECP256R1())
    
    # Get raw private key bytes (32 bytes)
    private_value = private_key.private_numbers().private_value
    private_bytes = private_value.to_bytes(32, byteorder='big')
    
    # Get uncompressed public key bytes (65 bytes: 0x04 + X + Y)
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # URL-safe base64 encoding without padding
    vapid_private = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')
    vapid_public = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
    
    return vapid_private, vapid_public

def main():
    print("Generating VAPID Keys using SECP256R1 curve...")
    private_key, public_key = generate_vapid_keys()
    
    print("\n--- Generated Keys ---")
    print(f"VAPID_PUBLIC_KEY={public_key}")
    print(f"VAPID_PRIVATE_KEY={private_key}")
    print("----------------------\n")
    
    # Check if .env file exists in the current directory
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        content = env_path.read_text(encoding='utf-8')
        
        # Check if keys are already present
        has_pub = "VAPID_PUBLIC_KEY" in content
        has_priv = "VAPID_PRIVATE_KEY" in content
        
        if has_pub or has_priv:
            print("[INFO] VAPID keys already exist in your backend .env file.")
            # Default behavior when run non-interactively
            print("Auto-appending new keys (non-interactive).")
        
        # Strip existing lines if overwriting
        lines = [line for line in content.splitlines() if not (line.startswith("VAPID_PUBLIC_KEY=") or line.startswith("VAPID_PRIVATE_KEY="))]
        lines.append(f"VAPID_PUBLIC_KEY={public_key}")
        lines.append(f"VAPID_PRIVATE_KEY={private_key}")
        
        env_path.write_text("\n".join(lines) + "\n", encoding='utf-8')
        print(f"[SUCCESS] Appended VAPID keys to {env_path.name}")
    else:
        # Create a new .env file
        env_path.write_text(f"VAPID_PUBLIC_KEY={public_key}\nVAPID_PRIVATE_KEY={private_key}\n", encoding='utf-8')
        print(f"[SUCCESS] Created a new .env file and wrote VAPID keys.")

if __name__ == "__main__":
    main()
