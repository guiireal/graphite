import React, { Component } from 'reactn';
import socketIOClient from 'socket.io-client';
import SlateEditor from './Editor';
import axios from 'axios';

class SocketEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      endpoint: axios.defaults.baseURL,
      showCollab: false,
      uniqueID: ""
    }
    const { userSession } = this.global;
    //TODO need to change this to use DID.
    if(userSession.isUserSignedIn()) {
      this.uniqueID = userSession.loadUserData().username;
    } else {
      this.uniqueID = Math.round(Math.random() * 1000000000000);
    }

    this.socket = socketIOClient(this.state.endpoint);
    this.socket.on('update content', data => {
      const content = JSON.parse(data)
      const { uniqueID, content: ops } = content;
      if (ops !== null && this.uniqueID !== uniqueID) {
        setTimeout(() => {
          try {
            this.slate.applyOperations(ops);
          } catch(e) {
            console.log(e)
          }
        });
        this.setState({showCollab: true, uniqueID: uniqueID})
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.removeAuthorship, 300)
      }
    });

  }

  componentDidMount() {
    let room;
    if(window.location.href.includes('docInfo')) {
        room = room = window.location.href.split('id=')[1];
    } else if(window.location.href.includes('shared')) {
        room = window.location.href.split('shared/docs/')[1].split('&id=')[1]
    } else {
      if(window.location.href.includes("new")) {
        room = window.location.href.split("new/")[1];
      } else if(window.location.href.includes('team')) {
        room = window.location.href.split('team/')[1].split('/')[1];
      } else {
        room = window.location.href.split("documents/")[1];
      }
    }
    this.socket.on('connect', () => {
      this.socket.emit('room', room)
    })
  }

  send = (content) => {
    const data = JSON.stringify({ content, uniqueID: this.uniqueID });
    this.socket.emit('update content', data);
  }

  onChange = (change) => {
    console.log("socket change")
    const ops = change.operations
    const ops2 = ops
      .filter(o => o.type !== 'set_selection' && o.type !== 'set_value' && o.type !== undefined && (!o.data || !o.data.has('source')))
      .toArray()
      // .toJS()
      .map(o => ({ ...o, data: { source: this.uniqueID } }))

    if (ops2.length > 0) {
      this.send(ops);
    }
  }

  removeAuthorship = () => {
    this.setState({ showCollab: false, uniqueID: ""})
  }

  render() {
    return (
      <SlateEditor
        ref={slateE => { this.slate = slateE; }}
        onChange={this.onChange}
        uniqueID={this.state.uniqueID}
      />
    );
  }
};

export default SocketEditor;
