var bulletinBoard = {};

var nextUnusedId = function() {
    var id = 0;
    $.each(bulletinBoard, function(i, v) {
        id = Math.max(id, parseInt(i));
    });
    return (id + 1) + '';
};

var colors = [
    '#ffd0d0', // pink
    '#ffd080', // orange
    '#ffff80', // yellow
    '#d0ffd0', // green
    '#b0d0ff', // blue
    '#ffe0ff', // purple
];

var nextColor = function(current) {
    return colors[(colors.indexOf(current) + 1) % colors.length];
};

var inSyncCall = false;
var receivedInitialData = false;

// actions is array of objects with keys: predicate ('delete', 'create', or 'update'), id, property, value
var commitStickyNoteChanges = function(actions) {
    $.each(actions, function(i, action) {
        if (action.predicate == 'delete') {
            delete bulletinBoard[action.id];
        }
        if (action.predicate == 'create') {
            bulletinBoard[action.id] = {text: ''};
        }
        if (action.predicate == 'update') {
            bulletinBoard[action.id][action.property] = action.value;
        }
    });
    document.dispatchEvent(new Event('updateState'));
    if (receivedInitialData) {
        makeSyncCall(actions);
    }
};

var makeSyncCall = function(actions) {
    inSyncCall = true;
    $.ajax({type: 'POST', timeout: 5000, url: '/reactdemo.py?' + new Date().getTime(),
        data: JSON.stringify(actions),
        success: function(resp) {
            inSyncCall = false;
            if (resp.message == 'success') {
                receivedInitialData = true;
                bulletinBoard = $.extend(true, {}, resp.data);
                document.dispatchEvent(new Event('updateState'));
            }
        },
        error: function(resp) {
            inSyncCall = false;
        }
    });
};

setInterval(function() {
    if (!inSyncCall) {
        makeSyncCall([]);
    }
}, 500);

var BulletinBoard = React.createClass({
    getInitialState: function() {
        return {data: {}};
    },
    componentDidMount: function() {
        document.addEventListener('updateState', this.updateState);
        this.updateState();
    },
    updateState: function(e) {
        this.setState({data: bulletinBoard});
    },
    createNote: function(e) {
        var newId = nextUnusedId();
        commitStickyNoteChanges([
            {predicate: 'create', id: newId},
            {predicate: 'update', id: newId, property: 'text', value: 'New note'},
            {predicate: 'update', id: newId, property: 'x', value: e.pageX},
            {predicate: 'update', id: newId, property: 'y', value: e.pageY},
            {predicate: 'update', id: newId, property: 'width', value: 150},
            {predicate: 'update', id: newId, property: 'height', value: 150}
        ]);
    },
    render: function() {
        var stickyNotes = [];
        $.each(this.state.data, function(i, stickyNote) {
            var stickyNoteClone = $.extend(true, {}, stickyNote);
            stickyNoteClone.id = i;
            stickyNotes.push(<StickyNote key={i} data={stickyNoteClone} />);
        });
        return (
            <div className="bulletinBoard" onClick={this.createNote}>
                {stickyNotes}
            </div>
        );
    }
});

var StickyNote = React.createClass({
    getInitialState: function() {
        return {
            isHover: false,
            isEditing: false,
            edit: undefined,
            isResizing: false,
            resizeX: undefined,
            resizeY: undefined,
            isMoving: false,
            moveX: undefined,
            moveY: undefined
        };
    },
    clickAbsorb: function(e) {
        e.stopPropagation();
    },
    hoverBegin: function() {
        this.setState({isHover: true});
    },
    hoverEnd: function() {
        this.setState({isHover: false});
    },
    doDelete: function(e) {
        commitStickyNoteChanges([{predicate: 'delete', id: this.props.data.id}]);
        e.stopPropagation();
    },
    doCycleColor: function(e) {
        commitStickyNoteChanges([{predicate: 'update', id: this.props.data.id, property: 'bgColor', value: nextColor(bulletinBoard[this.props.data.id].bgColor || '#ffff80')}]);
        e.stopPropagation();
    },
    resizeBegin: function() {
        this.setState({
            isResizing: true,
            resizeX: this.props.data.width,
            resizeY: this.props.data.height
        });
        document.addEventListener('mousemove', this.resizeMove);
        document.addEventListener('mouseup', this.resizeEnd);
    },
    resizeEnd: function(e) {
        this.setState({isResizing: false});
        commitStickyNoteChanges([
            {predicate: 'update', id: this.props.data.id, property: 'width', value: this.state.resizeX},
            {predicate: 'update', id: this.props.data.id, property: 'height', value: this.state.resizeY}
        ]);
        document.removeEventListener('mousemove', this.resizeMove);
        document.removeEventListener('mouseup', this.resizeEnd);
    },
    resizeMove: function(e) {
        this.setState({
            resizeX: e.pageX - this.props.data.x + 10,
            resizeY: e.pageY - this.props.data.y + 10
        });
    },
    resizeClick: function(e) {
        e.stopPropagation();
    },
    moveBegin: function() {
        this.setState({
            isMoving: true,
            moveX: this.props.data.x,
            moveY: this.props.data.y
        });
        document.addEventListener('mousemove', this.moveMove);
        document.addEventListener('mouseup', this.moveEnd);
    },
    moveEnd: function(e) {
        this.setState({isMoving: false});
        commitStickyNoteChanges([
            {predicate: 'update', id: this.props.data.id, property: 'x', value: this.state.moveX},
            {predicate: 'update', id: this.props.data.id, property: 'y', value: this.state.moveY}
        ]);
        document.removeEventListener('mousemove', this.moveMove);
        document.removeEventListener('mouseup', this.moveEnd);
    },
    moveMove: function(e) {
        this.setState({
            moveX: e.pageX - 26,
            moveY: e.pageY - 10
        });
    },
    moveClick: function(e) {
        e.stopPropagation();
    },
    editBegin: function(e) {
        this.setState({
            isEditing: true,
            edit: this.props.data.text
        });
        setTimeout(function() {
            this._edit.focus();
        }.bind(this), 50);
        document.getElementsByClassName('bulletinBoard')[0].addEventListener('click', this.editClick);
        e.stopPropagation();
    },
    editChange: function(e) {
        this.setState({edit: e.target.value});
    },
    editClick: function(e) {
        e.stopPropagation();
    },
    editEnd: function(e) {
        this.setState({isEditing: false});
        commitStickyNoteChanges([{predicate: 'update', id: this.props.data.id, property: 'text', value: this.state.edit}]);
        setTimeout(function() {
            document.getElementsByClassName('bulletinBoard')[0].removeEventListener('click', this.editClick);
        }.bind(this), 300);
        e.stopPropagation();
    },
    render: function() {
        var styles = {
            top: (this.state.isMoving ? this.state.moveY : this.props.data.y),
            left: (this.state.isMoving ? this.state.moveX : this.props.data.x),
            width: (this.state.isResizing ? this.state.resizeX : this.props.data.width),
            height: (this.state.isResizing ? this.state.resizeY : this.props.data.height),
        };
        var stylesNote = {
            backgroundColor: this.props.data.bgColor || '#ffff80',
            borderWidth: this.props.data.borderWidth || 1,
            borderColor: this.props.data.borderColor || 'black'
        };
        var stylesFold = {
            // top: (this.state.isMoving ? this.state.moveY : this.props.data.y) - 1,
            // left: (this.state.isMoving ? this.state.moveX : this.props.data.x) - 1,
        };
        var stylesDelete = {
            display: (this.state.isHover ? 'block' : 'none')
        };
        var stylesColors = {
            display: (this.state.isHover ? 'block' : 'none'),
            backgroundColor: nextColor(this.props.data.bgColor || '#ffff80')
        };
        var stylesResize = {
            display: (this.state.isHover ? 'block' : 'none')
        };
        var stylesMove = {
            display: (this.state.isHover ? 'block' : 'none')
        };
        var stylesBody = {
            display: (this.state.isEditing ? 'none' : 'block')
        };
        var stylesEdit = {
            display: (this.state.isEditing ? 'block' : 'none')
        };
        return (
            <div className="stickyNoteContainer" style={styles} onClick={this.clickAbsorb}>
                <div className="stickyNote" style={stylesNote} onMouseEnter={this.hoverBegin} onMouseLeave={this.hoverEnd} onClick={this.clickAbsorb}>
                    <div className="delete" style={stylesDelete} onClick={this.doDelete}></div>
                    <div className="color" style={stylesColors} onClick={this.doCycleColor}></div>
                    <div className="resize" style={stylesResize} onMouseDown={this.resizeBegin} onClick={this.resizeClick}></div>
                    <div className="move" style={stylesMove} onMouseDown={this.moveBegin} onClick={this.moveClick}></div>
                    <div className="body" style={stylesBody} onClick={this.editBegin}>
                        {this.props.data.text}
                    </div>
                    <textarea ref={(c) => this._edit = c} className="edit" style={stylesEdit} value={this.state.edit} onChange={this.editChange} onClick={this.editClick} onBlur={this.editEnd}></textarea>
                </div>
                <div className="fold" style={stylesFold} onClick={this.clickAbsorb}></div>
            </div>
        );
    }
});

ReactDOM.render(
    <BulletinBoard />,
    document.getElementById('content')
);
