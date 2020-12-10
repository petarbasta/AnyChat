import asyncio
import websockets
import json
import datetime

# openChats
# {
#   chatName: { 
#       lastUpdated: 
#       numMessages: 
#   }
# }
openChats = {}
# users 
# {
#   chatName: [user1, user2]
# }
users = {}
allUsers = []

# Gets called for every connection
async def anychat(websocket, path):
    # Add to all users
    allUsers.append(websocket)
    # Loop until client disconnects
    while True:
        try:
            # Get request data
            data = await websocket.recv()
            data = data.split(',')
            action = data[0]
            # Process request
            if (action == "getOpenChats"):
                await getOpenChats(websocket)
            if (action == "getChat"):
                await getChat(data, websocket)  
            if (action == "writeMessage"):
                await writeMessage(data, websocket)
  
        # If client disconnects
        except websockets.ConnectionClosed:
            # Remove from chat list
            removeUser(websocket)
            # Remove from all users
            allUsers.remove(websocket)
            print("Terminated")
            break

# Returns all open chats
async def getOpenChats(websocket):
    response = {}
    response["type"] = "openChats"
    response["data"] = openChats
    await websocket.send(json.dumps(response))

# Returns specific chat
async def getChat(data, websocket):
    # Remove if currently in other chat
    removeUser(websocket)
    chatName = data[1]

    # If chat exists
    if (chatName in openChats.keys()):
        # Place in chat
        users[chatName].append(websocket)
        print("Placed in " + str(chatName))
        # Return chat to client
        response = {}
        response["type"] = "chat"
        response["data"] = readChatFromFile(chatName)
        await websocket.send(json.dumps(response))
    # If chat doesn't exist
    else:
        now = datetime.datetime.now()
        time = str(now.hour) + ":" + str(now.minute) + ":" + str(now.second)
        # Add chat to openChats
        openChats[chatName] = { 
            "lastUpdated": time,
            "numMessages": 0    
        }

        # Add user to chat
        users[chatName] = []
        users[chatName].append(websocket)

        # Create chat file
        filename = "Chats\\" + str(chatName) + ".json"

        with open(filename, "w") as jsonFile:
            json.dump({}, jsonFile)
            # Send empty chat to user
            response = {}
            response["type"] = "chat"
            response["data"] = {}
            await websocket.send(json.dumps(response))
        
        # Update Open chat all users
        for user in allUsers:
            response = {}
            response["type"] = "openChats"
            response["data"] = openChats
            await user.send(json.dumps(response))

        

async def writeMessage(data, websocket):
    # Parse data
    chatName = data[1]
    username = data[2]
    message = data[3]

    # Get all messages in chat
    messages = readChatFromFile(chatName)

    now = datetime.datetime.now()
    time = str(now.hour) + ":" + str(now.minute) + ":" + str(now.second)

    newMessage = {
        "author" : username,
        "time" : time,
        "message" : message
    }
    # Update time 
    openChats[chatName]["lastUpdated"] = time
    # Add new message
    messages[openChats[chatName]["numMessages"] + 1] = newMessage
    # Increase message count
    openChats[chatName]["numMessages"] = openChats[chatName]["numMessages"] + 1
    
    # Write back to file
    filename = "Chats\\" + str(chatName) + ".json"
    with open(filename, "w") as jsonFile:
        json.dump(messages, jsonFile)

    # Send new message to all in chat
    for user in users[chatName]:
        # if (user != websocket):
        response = {}
        response["type"] = "message"
        response["data"] = newMessage
        await user.send(json.dumps(response))

    # Send new time to all 
    for user in allUsers:
        response = {}
        response["type"] = "openChats"
        response["data"] = openChats
        await user.send(json.dumps(response))

# Reads chat from file
def readChatFromFile(chatName):
    # Read from file
    filename = "Chats\\" + str(chatName) + ".json"
    with open(filename, "r") as jsonFile:
        messages = json.load(jsonFile)
        # Return all messages
        return messages

# Removes user from all chats
def removeUser(websocket):
    for key, value in users.items():
        if (websocket in value):
            users[key].remove(websocket)
            print("Removed from " + str(key))

# Server setup and infinite loop
start_server = websockets.serve(anychat, "localhost", 8888)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()