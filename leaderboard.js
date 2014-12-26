// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");

if (Meteor.isClient) {
  Template.leaderboard.helpers({
    players: function () {
      return Players.find({}, { sort: { score: -1, name: 1 } });
    },
    selectedName: function () {
      var player = Players.findOne(Session.get("selectedPlayer"));
      return player && player.name;
    }
  });

  Template.leaderboard.events({
    'click .inc': function () {
      Players.update(Session.get("selectedPlayer"), {$inc: {score: 5}});
    },
    'click .submitButton': function(event, template) {
      var newName  = template.find(".addPlayerBox .name").value;
      var newField = template.find(".addPlayerBox .field").value;
      if (newName && newField) {
        Players.insert({
          name: newName,
          score: Math.floor(Random.fraction() * 10) * 5,
          field: newField
        });
        template.find(".addPlayerBox .name").value = "";
        template.find(".addPlayerBox .field").value = "";
      }
      return false;
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("selectedPlayer", this._id) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {
      Session.set("selectedPlayer", this._id);
    },
    'click .cross': function() {
      Players.remove(Session.get("selectedPlayer",this._id));
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
    this.find("select").value = this.data.field;
  }

  Template.fieldsComboBox.events ({
    'change select': function (event,template) {
      var newField = template.find("select").value; 
      Players.update(this._id,{$set: {field: newField}});
    }
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() === 0) {
      var names = ["Ada Lovelace", "Grace Hopper", "Marie Curie",
                   "Carl Friedrich Gauss", "Nikola Tesla", "Claude Shannon"];
      var domains = ["Algorithmics", "Algorithmics", "Chemistry",
                     "Mathematics", "Physics", "Mathematics"];
      for (var i = 0, c = names.length; i < c; ++i) {
        Players.insert({
          name: names[i],
          score: Math.floor(Random.fraction() * 10) * 5,
          field: domains[i]
        });
      }
    }
  });
}

