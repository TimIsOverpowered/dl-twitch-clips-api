const { authenticate } = require('@feathersjs/authentication').hooks;
const { disallow } = require('feathers-hooks-common');
const { setField } = require('feathers-authentication-hooks');

module.exports = {
  before: {
    all: [],
    find: [ disallow('external') ],
    get: [ authenticate('jwt'), 
    setField({
      from: 'params.user.id',
      as: 'params.query.id'
    }) ],
    create: [ disallow('external') ],
    update: [  disallow('external') ],
    patch: [  disallow('external') ],
    remove: [ disallow('external') ]
  },

  after: {
    all: [ 
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
