import React, { Component } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import 'bootstrap/dist/css/bootstrap.min.css'
import logo from './logo.jpg';

const client = new W3CWebSocket('ws://127.0.0.1:8888/');

type ChatState = {
  openChats: any,
  messages: any,
  currentChat: any,
  messageInput: string,
  topic: string
}

class App extends Component<{}, ChatState>{
  username: string

  constructor(props: any) {
    super(props)
    this.getChat = this.getChat.bind(this)
    this.writeMessage = this.writeMessage.bind(this)
    this.onUsernameChange = this.onUsernameChange.bind(this)
    this.onTopicChange = this.onTopicChange.bind(this)
    this.onMessageChange = this.onMessageChange.bind(this)
    this.getTimeLeft = this.getTimeLeft.bind(this)
    this.startTimer = this.startTimer.bind(this)
    this.countDown = this.countDown.bind(this)
    this.getRandomChat = this.getRandomChat.bind(this)
    this.getFontColor = this.getFontColor.bind(this)

    this.username = ""

    this.state = {
      openChats: null,
      messages: null,
      currentChat: null,
      messageInput: "",
      topic: ""
    }
  }

  // Starts countdown timers
  startTimer() {
    setInterval(this.countDown, 1000);
  }

  // Keeps track of countdown timers
  countDown() {
    let openChats: any = {}
    // For each chat
    for (let key in this.state.openChats) {
      let timeLeft: any = this.state.openChats[key]["timeLeft"]
      // Decrement seconds
      if (timeLeft[2] > 0) {
        timeLeft[2] -= 1
      }
      else {
        // If timer expires
        if (timeLeft[1] <= 0 && timeLeft[2] <= 0) {
          timeLeft[1] = 59
          timeLeft[0] -= 1
        }
        // Decrement minute is seconds at 0
        else {
          timeLeft[2] = 59
          timeLeft[1] -= 1
        }
      }

      // Pad with 0 if needed
      if (timeLeft[2].toString().length === 1) {
        timeLeft[2] = "0" + timeLeft[2]
      }

      openChats[key] = {
        "numMessages": this.state.openChats[key]["numMessages"],
        "timeLeft": timeLeft
      }
    }
    // Force re-render
    this.setState({
      openChats: openChats
    });
  }

  componentDidMount() {
    client.onopen = () => {
      // Initialize state and start timers
      this.setState({ openChats: {}, messages: {} }, () => {
        this.startTimer()
      })
      // Request open chats
      client.send(['getOpenChats'])

    };
    client.onmessage = (message: any) => {
      const response = JSON.parse(message.data);
      // If list of chats
      if (response["type"] === "openChats") {
        let openChats: any = {}
        // For each chat
        Object.keys(response["data"]).forEach((key: string) => {
          // Calculate time remaining and update
          var timeLeft = this.getTimeLeft(response["data"][key]["lastUpdated"])
          openChats[key] = {
            "numMessages": response["data"][key]["numMessages"],
            "timeLeft": timeLeft
          }
        })
        this.setState({ openChats: openChats })
      }
      // If receives all messages for chat
      else if (response["type"] === "chat") {
        this.setState({ messages: response["data"] })
      }
      // If receives new message
      else if (response["type"] === "message") {
        let newMessage = response["data"]
        let newMessages = this.state.messages
        // Add new message to message list
        newMessages[this.state.openChats[this.state.currentChat]["numMessages"] + 1] = newMessage
        let newChats = this.state.openChats
        // Increment number of messages        
        newChats[this.state.currentChat]["numMessages"] = newChats[this.state.currentChat]["numMessages"] + 1
        this.setState({ messages: newMessages, openChats: newChats })
      }
      else {
        throw new Error()
      }
    };
  }

  // Hardcoded for now, each user should have unique colour
  getFontColor(author: string) {
    if (author === "Amanda"){
      return "#E4581D"
    }
    else if (author === "Steve"){
      return "#0088cc"
    }
    else {
      return "red"
    }
  }

  render() {
    if (this.state === null) {
      return null;
    }

    // Render all open chats
    const openChatsTable = !this.state.openChats ? null : Object.keys(this.state.openChats).map((key) => {
      let row = this.state.openChats[key]["timeLeft"][0] < 0 ? null : (
        <tr key={key} onClick={() => this.getChat(key)}>
          <td >{key}</td>
          <td>{this.state.openChats[key]["numMessages"]}</td>
          <td>{this.state.openChats[key]["timeLeft"][1] + ":" + this.state.openChats[key]["timeLeft"][2]}</td>
        </tr>
      )
      return row
    })

    // Render all messages
    const messages = !this.state.messages ? null : Object.keys(this.state.messages).map((key) => {
      let row = !this.state.currentChat ? null : (
        <tr key={key}>
          <td style={{color: this.getFontColor(this.state.messages[key]["author"]), fontFamily: "Courier"}}>{this.state.messages[key]["author"]}:</td>
          <td style={{fontFamily: "Courier"}}>{this.state.messages[key]["message"]}</td>
        </tr>
      )
      return row
    })

    // Render topic message
    const topicSelectedText = !this.state.currentChat ? <h1 style={{fontFamily: "Courier"}}>Select a topic to begin chatting</h1> :
      <h1 style={{fontFamily: "Courier"}}>{"Chatting about: " + this.state.currentChat}</h1>

    return (
      // Whole screen
      <div style={{ position: "absolute", height: "100%", width: "100%", backgroundColor: "#FDB694" }}>
        {/* Left side of screen */}
        <div style={{ height: "100%", display: "flex", flexDirection: "row", justifyContent: "center" }}>
          {/* Logo and search buttons */}
          <div style={{marginLeft: "20px", display: "flex", flexDirection: "column", alignItems: "center", width: "45%" }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", height: "55%" }}>
              {/* Logo */}
              <img src={logo} style={{ width: "55%" }} alt="logo" />
              {/* Search bar */}
              <input value={this.state.topic} className="form-control py-2 rounded-pill mr-1 pr-5" style={{ marginTop: "2%", width: "90%", textAlign: "center", height: "50px", textIndent: "40px", border: "2px solid gray", backgroundColor: "#FFE4C4" }} type="text" placeholder="Pick a new topic!" onChange={this.onTopicChange}></input>
              <div style={{ width: "50%", display: "flex", flexDirection: "row", justifyContent: "center", marginTop: "2%"}}>
                {/* Talk about it button */}
                <button className="btn" style={{ fontFamily: "Courier", backgroundColor: "#FF7F50", border: "1px solid gray", margin: "2%", marginRight: "2%", width: "40%" }} onClick={() => { 
                  this.getChat(this.state.topic)
                  this.setState({topic: ""}
                  )}}>
                  Talk about it
                  </button>
                  {/* Random button */}
                <button className="btn" style={{ fontFamily: "Courier", backgroundColor: "#FF7F50", border: "1px solid gray", margin: "2%", marginLeft: "2%", width: "40%" }} onClick={() => this.getRandomChat()}>
                  Random :)
                  </button>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "50%" }}>
              <h2 style={{fontFamily: "Courier"}}>Live Chats</h2>
              {/* Live chats table */}
              <div className="rounded-lg" style={{ height: "79%", width: "60%", border: "2px solid grey", backgroundColor: "#FFE4C4" }}>
                <table style={{ textAlign: "center" }} className="table table-hover table-striped">
                  <tbody>
                    <tr >
                      <th style={{fontFamily: "Courier"}}>Topic</th>
                      <th style={{fontFamily: "Courier"}}>Number of Messages</th>
                      <th style={{fontFamily: "Courier"}}>Time left</th>
                    </tr>
                    {openChatsTable}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* Right side of screen */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: "55%", marginRight: "0px" }}>

            <div className="rounded-lg" style={{ display: "flex", flexDirection: "column", marginTop: "3%", height: "80%", width: "92%", marginRight: "1%", border: "2px solid grey", backgroundColor: "#FFE4C4" }}>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "20%", width: "100%"}}>
                {/* Topic text */}
                <div style={{ marginTop: "2%", marginBottom: "1%" }}>
                  {topicSelectedText}
                </div>
                {/* Username input */}
                <div>
                  <input className="form-control py-2 rounded-pill mr-1 pr-5" style={{ fontFamily: "Courier", backgroundColor: "#FDB694", border: "2px solid gray", textAlign: "center", margin: "5px", width: "100%", height: "80%", textIndent: "20px" }} type="text" placeholder="Username" onChange={this.onUsernameChange}></input>
                </div>
                {/* Division line */}
                <hr style={{ margin: "2%", backgroundColor: "lightgrey", height: 1, width: "100%" }}/>
              </div>
              
              {/* Message table */}
              <div style={{ height: "80%", width: "100%", marginTop: "1%" }}>
                <table className="table-sm">
                  <tbody>
                    {messages}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ width: "92%", marginTop: "0.5%", marginRight: "1%", display: "flex", flexDirection: "row", justifyContent: "center" }}>
              {/* Message input */}
              <textarea value={this.state.messageInput}  className="rounded-lg" style={{ backgroundColor: "#FFE4C4", border: "2px solid grey", height: "105px", marginRight: "0.5%", width: "100%" }} placeholder="Send a message" onChange={this.onMessageChange}></textarea>
              {/* Send button */}
              <button className="btn" style={{ fontFamily: "Courier", backgroundColor: "#FF7F50", border: "2px solid grey", width: "20%", height: "100%" }} onClick={this.writeMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Update username
  onUsernameChange(event: any) {
    this.username = event.target.value
  }

  // Update topic
  onTopicChange(event: any) {
    this.setState({
      topic: event.target.value
    })
  }

  // Update message
  onMessageChange(event: any) {
    this.setState({
      messageInput: event.target.value
    })
  }

  // Request open chats
  getOpenChats() {
    client.send(['getOpenChats'])
  }

  // Send new message
  writeMessage() {
    this.setState({
      messageInput: ""
    })
    client.send((['writeMessage', this.state.currentChat, this.username, this.state.messageInput]))
  }

  // Request random chat
  getRandomChat() {
    // Get all keys
    let chatKeys: any = []
    Object.keys(this.state.openChats).forEach((key: string) => {
      chatKeys.push(key)
    })
    // Get random index
    let index = Math.floor(Math.random() * chatKeys.length)
    // Update state with new chat
    this.setState({ currentChat: chatKeys[index]}, () => {
      client.send(['getChat', chatKeys[index]])
    })
  }

  // Request specific chat
  getChat(key: string) {
    if (key !== "") {
      this.setState({ currentChat: key }, () => {
        client.send(['getChat', key])
      })
    }
  }

  // Calculates time remaining on chat
  getTimeLeft(lastUpdatedString: string) {
    let dateTime = new Date()
    // Put time into form [hours, seconds, minutes]
    let currTime = [dateTime.getHours(), dateTime.getMinutes(), dateTime.getSeconds()]
    let lastUpdated = lastUpdatedString.split(":", 3)
    let expiryTime = lastUpdated.map((x) => {
      return parseInt(x)
    })
    // 5 min timer
    expiryTime[1] += 5
    let deltaSec, deltaMin, deltaHour = 0

    // If seconds difference is positive
    if (expiryTime[2] - currTime[2] > 0) {
      deltaSec = expiryTime[2] - currTime[2]
    }
    // Carry over from minutes
    else {
      deltaSec = expiryTime[2] + 60 - currTime[2]
      expiryTime[1] -= 1
    }
    // If minutes difference is positive
    if (expiryTime[1] - currTime[1] > 0) {
      deltaMin = expiryTime[1] - currTime[1]
    }
    // Carry over from hours
    else {
      deltaMin = expiryTime[1] + 60 - currTime[1]
      expiryTime[0] -= 1
    }
    deltaHour = expiryTime[0] - currTime[0]

    // If 60 seconds, wrap to 0 and increase minutes
    if (deltaSec === 60) {
      deltaSec = 0
      deltaMin += 1
    }
    // If 60 minutes, wrap to 0 and increase hours
    if (deltaMin === 60) {
      deltaMin = 0
      deltaHour += 1
    }
    // Pad with 0s if necessary
    if (deltaSec.toString().length === 1) {
      deltaSec = "0" + deltaSec
    }

    let timeLeft = [deltaHour, deltaMin, deltaSec]
    return timeLeft
  }
}

export default App;