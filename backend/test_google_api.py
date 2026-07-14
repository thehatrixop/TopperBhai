from db.supabase_client import supabase
import httpx
import asyncio

async def main():
    print("Testing Google Tasks API integration...")
    
    # Get user token
    res = supabase.table("user_google_tokens").select("*").limit(1).execute()
    if not res.data:
        print("[ERROR] No user tokens found in database. Connect Google Tasks first.")
        return
        
    token_data = res.data[0]
    access_token = token_data.get("access_token")
    user_id = token_data.get("user_id")
    print(f"Loaded credentials for user: {user_id}")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        # 1. Test GET lists
        print("\n1. GET https://tasks.googleapis.com/tasks/v1/users/@me/lists")
        lists_res = await client.get("https://tasks.googleapis.com/tasks/v1/users/@me/lists", headers=headers)
        print(f"Status Code: {lists_res.status_code}")
        print(f"Response Body:\n{lists_res.text}\n")
        
        # 2. Test POST list (simulate list creation)
        print("2. POST https://tasks.googleapis.com/tasks/v1/users/@me/lists")
        create_res = await client.post(
            "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
            headers=headers,
            json={"title": "TopperBhai Task Quest Test"}
        )
        print(f"Status Code: {create_res.status_code}")
        print(f"Response Body:\n{create_res.text}\n")

if __name__ == "__main__":
    asyncio.run(main())
