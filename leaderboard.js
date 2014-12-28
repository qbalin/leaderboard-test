// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection('players');

Router.route('/', function () {
  Session.set('leaderboardIndex', 0);
  this.layout('app');
  this.render('leaderboard');
  this.render('footer', {
    to: 'footer',
    data: {path: '/about' ,text: 'About'}
  });
});

Router.route('/about', function () {
  this.layout('app');
  this.render('about');
  this.render('footer', {
    to: 'footer',
    data: {path: '/', text: 'Home'}
  });
});

Router.route('/fork/:idx', function () {
  Session.set('leaderboardIndex',this.params.idx);
  this.layout('app');
  var leaderboardPresent = (Players.find({index: parseInt(this.params.idx)}).count() !== 0);
  if (leaderboardPresent) {
    this.render('leaderboard');
  } else {
    this.render('noLeaderboard');
    this.render('footer', {
    to: 'footer',
    data: {path: '/', text: 'Home'}
  });

  }
});


if (Meteor.isClient) {
  Meteor.startup(function () {
    Session.set('sortUp', false);
    Session.set('sortingCategory', 'score');
  });

  Template.leaderboard.helpers({
    players: function () {
      var idx = parseInt(Session.get('leaderboardIndex'));
      var sortCat = Session.get('sortingCategory').toLowerCase();
      var sortUp = Session.get('sortUp');
      if (sortCat === 'name'){
        if (sortUp) {
          return Players.find({index: idx}, { sort: {name:  1} });
        } else {
          return Players.find({index: idx}, { sort: {name: -1} });
        }
      } else if (sortCat === 'score') {
        if (sortUp) {
          return Players.find({index: idx}, { sort: {score:  1} });
        } else {
          return Players.find({index: idx}, { sort: {score: -1} });
        }
      } else if (sortCat === 'field') {
        if (sortUp) {
          return Players.find({index: idx}, { sort: {field:  1} });
        } else {
          return Players.find({index: idx}, { sort: {field: -1} });
        }
      }
    },
    selectedName: function () {
      var player = Players.findOne(Session.get('selectedPlayer'));
      return player && player.name;
    },
    sortButtons: [{label: 'Name'}, {label: 'Field'}, {label: 'Score'}]
  });

  Template.leaderboard.events({
    'click .inc': function () {
      Players.update(Session.get('selectedPlayer'), {$inc: {score: 5}});
    },
    'click .submitButton': function(event, template) {
      var newName  = template.find('.addPlayerBox .name').value;
      var newField = template.find('.addPlayerBox .field').value;
      var idx = parseInt(Session.get('leaderboardIndex'));
      if (newName && newField) {
        Players.insert({
          index: idx,
          name: newName,
          score: Math.floor(Random.fraction() * 10) * 5,
          field: newField
        });
        template.find('.addPlayerBox .name').value = '';
        template.find('.addPlayerBox .field').value = '';
      }
      return false;
    },
    'click .forker': function () {
      var idx = parseInt(Session.get('leaderboardIndex'));
      if (idx === 0 && Players.find({index: 0}).count() === 0) {
        alert('The home page cannot be forked if empty. Add players!');
      } else {
        var copy = Players.find({index: idx},{fields: {index: 0, _id: 0}}).fetch();
        var count = copy.length;
        idx = 1;
        //Find the smallest available fork index
        while (Players.findOne({index: idx})) {
          ++idx;
        }
        for (var i = 0; i < count; ++i) {
          Players.insert({
            index: idx,
            score: copy[i].score,
            name:  copy[i].name,
            field: copy[i].field
          });
        }
        var path = '/fork/' + idx;
        Router.go(path);
      }
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals('selectedPlayer', this._id) ? 'selected' : '';
    }
  });

  Template.player.events({
    'click': function (event, template) {
      Session.set('selectedPlayer', this._id);
      if (document.querySelector('.fieldComboBox')) {
        document.querySelector('.fieldComboBox').value = this.field;
      }
    },
    'click .cross': function() {
      Players.remove(Session.get('selectedPlayer',this._id));
    }
  });

  Template.fieldsComboBox.helpers({
    fields: function () {
      var fieldsList =  _.uniq(Players
                            .find({},{sort: {field:1}, fields:{field:1}})
                            .map(function(x){return x.field})
                          ,true);
      return fieldsList;
    }
  });

  Template.fieldsComboBox.rendered = function() {
    var selectedPlayerId = Session.get('selectedPlayer');
    var field = Players.findOne(selectedPlayerId, {fields: {field: 1}}).field;
    this.find('select').value = field;
  }

  Template.fieldsComboBox.events ({
    'change select': function (event,template) {
      var newField = template.find('select').value; 
      var id = Session.get('selectedPlayer');
      Players.update(id, {$set: {field: newField}});
    }
  });
 
  Template.sortButton.events ({
    'click': function () {
      var mem = Session.get('sortingCategory');
      Session.set('sortingCategory',this.label);
      if (mem === this.label) {
        Session.set('sortUp',!Session.get('sortUp'));
      }
    }
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() === 0) {
      var idx = 0;
      var names = ['Ada Lovelace', 'Grace Hopper', 'Marie Curie',
                   'Carl Friedrich Gauss', 'Nikola Tesla', 'Claude Shannon'];
      var domains = ['Algorithmics', 'Algorithmics', 'Chemistry',
                     'Mathematics', 'Physics', 'Mathematics'];
      for (var i = 0, c = names.length; i < c; ++i) {
        Players.insert({
          index: idx,
          name: names[i],
          score: Math.floor(Random.fraction() * 10) * 5,
          field: domains[i]
        });
      }
    }
  });
}

