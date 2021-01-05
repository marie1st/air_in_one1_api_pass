const { testAxiosBuilder } = require("./utils/testAxios")
const { v4: uuidv4 } = require('uuid');

module.exports.default = () => {

  describe('Test Buildings', () => {
    let body = {
      name: uuidv4(),
      picture: "https://png.pngtree.com/png-clipart/20190920/original/pngtree-suburban-high-rise-residential-building-illustration-png-image_4619899.jpg",
      avatar: "/img/graphics/building.png",
      is_two_level: false,
      position: {
        "top": 0.3,
        "left": 0.2,
        "width": 0.5,
        "height": 0.2
      }
    }

    test('Add Building (3 Level)', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      let response = await axios.post("/buildings", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("building")
      expect(response.data).toEqual(expect.objectContaining(body))

      global.building3LevelId = response.data.id;
    });

    test('Add Building (2 Level)', async () => {
      let axios = testAxiosBuilder(global.accessToken)

      body.is_two_level = true;
      let response = await axios.post("/buildings", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("building")
      expect(response.data).toEqual(expect.objectContaining(body))

      global.building2LevelId = response.data.id;
    });

    if (global.deepMode) {
      test('Get Building (2 Level)', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        let response = await axios.get("/buildings/"+global.building2LevelId)

        expect(response.data.id).toEqual(global.building2LevelId)
        expect(response.data.type).toEqual("building")
        expect(response.data).toEqual(expect.objectContaining(body))
      });

      test('Get Buildings', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        let response = await axios.get("/buildings")

        expect(response.data.length).toEqual(2)

        expect(response.data[0].id).toEqual(global.building3LevelId)
        // expect(response.data[0].type).toEqual("building")
        expect(response.data[0]).toEqual(expect.objectContaining({...body, is_two_level: false}))

        expect(response.data[1].id).toEqual(global.building2LevelId)
        // expect(response.data[1].type).toEqual("building")
        expect(response.data[1]).toEqual(expect.objectContaining({...body, is_two_level: true}))
      });

      test('Patch Building', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        body.name = uuidv4();
        body.is_two_level = false;
        let response = await axios.patch("/buildings/"+global.building3LevelId, {name: body.name})

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data).toEqual(expect.objectContaining(body))
      });

      test('Get Building (3 Level)', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        body.is_two_level = false;
        let response = await axios.get("/buildings/"+global.building3LevelId)

        expect(response.data.id).toEqual(global.building3LevelId)
        expect(response.data.type).toEqual("building")
        expect(response.data).toEqual(expect.objectContaining(body))
      });

      test('Delete Building', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        let response = await axios.delete("/buildings/"+global.building3LevelId)
      });

      test('Get Buildings After Delete', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        let response = await axios.get("/buildings")

        expect(response.data.length).toEqual(1)

        expect(response.data[0].id).toEqual(global.building2LevelId)
        // expect(response.data[0].type).toEqual("building")
        expect(response.data[0]).toEqual(expect.objectContaining({...body, is_two_level: true, name: response.data[0].name}))
      });

      test('Add Building (3 Level) Again', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        body.is_two_level = false;
        let response = await axios.post("/buildings", body)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data).toEqual(expect.objectContaining(body))

        global.building3LevelId = response.data.id;
      });

      test('Get Buildings After Add Again', async () => {
        let axios = testAxiosBuilder(global.accessToken)

        let response = await axios.get("/buildings")

        expect(response.data.length).toEqual(2)

        expect(response.data[0].id).toEqual(global.building2LevelId)
        // expect(response.data[0].type).toEqual("building")
        expect(response.data[0]).toEqual(expect.objectContaining({...body, is_two_level: true, name: response.data[0].name}))

        expect(response.data[1].id).toEqual(global.building3LevelId)
        // expect(response.data[1].type).toEqual("building")
        expect(response.data[1]).toEqual(expect.objectContaining({...body, is_two_level: false}))
      });
    }
  });





  describe('Test Floors', () => {
    let body = {
      name: uuidv4(),
      picture: "https://png.pngtree.com/png-clipart/20190920/original/pngtree-suburban-high-rise-residential-building-illustration-png-image_4619899.jpg",
      avatar: "/img/graphics/building.png",
      position: {
        "top": 0.3,
        "left": 0.2,
        "width": 0.5,
        "height": 0.2
      }
    }
    
    test('Add Floor', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      body.building_id = global.building3LevelId
      let response = await axios.post("/floors", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("floor")
      expect(response.data).toEqual(expect.objectContaining(body))

      global.floor3LevelId = response.data.id;
    })

    if (global.deepMode) {
      test('Patch Floor', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.name = uuidv4()
        let response = await axios.patch("/floors/"+global.floor3LevelId, {name: body.name})

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Floor', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/floors/"+global.floor3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Building Children', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("floor")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })

      test('Delete Floor', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.delete("/floors/"+global.floor3LevelId)
      })

      test('Get Building Children After Delete', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(0)
      })

      test('Add Floor (Again)', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.building_id = global.building3LevelId
        let response = await axios.post("/floors", body)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data).toEqual(expect.objectContaining(body))

        global.floor3LevelId = response.data.id;
      })

      test('Get Building Children After Add Again', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("floor")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })
    }
  })




  describe('Test Rooms 2 Level Basic', () => {
    let body = {
      name: uuidv4(),
      picture: "https://png.pngtree.com/png-clipart/20190920/original/pngtree-suburban-high-rise-residential-building-illustration-png-image_4619899.jpg",
      avatar: "/img/graphics/building.png",
      position: {
        "top": 0.3,
        "left": 0.2,
        "width": 0.5,
        "height": 0.2
      }
    }
    
    test('Add Room', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      body.building_id = global.building2LevelId
      let response = await axios.post("/rooms", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("room")
      expect(response.data).toEqual(expect.objectContaining(body))

      global.room2LevelId = response.data.id;
    })

    if (global.deepMode) {
      test('Patch Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.name = uuidv4()
        let response = await axios.patch("/rooms/"+global.room2LevelId, {name: body.name})

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/rooms/"+global.room2LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Building Children', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building2LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("room")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })

      test('Delete Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.delete("/rooms/"+global.room2LevelId)
      })

      test('Get Building Children After Delete', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building2LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(0)
      })

      test('Add Room (Again)', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.building_id = global.building2LevelId
        let response = await axios.post("/rooms", body)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))

        global.room2LevelId = response.data.id;
      })

      test('Get Building Children After Add Again', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/buildings/"+global.building2LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("building")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("room")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })
    }
  })




  describe('Test Rooms 3 Level Basic', () => {
    let body = {
      name: uuidv4(),
      picture: "https://png.pngtree.com/png-clipart/20190920/original/pngtree-suburban-high-rise-residential-building-illustration-png-image_4619899.jpg",
      avatar: "/img/graphics/building.png",
      position: {
        "top": 0.3,
        "left": 0.2,
        "width": 0.5,
        "height": 0.2
      }
    }
    
    test('Add Room', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      body.floor_id = global.floor3LevelId
      let response = await axios.post("/rooms", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("room")
      expect(response.data).toEqual(expect.objectContaining(body))

      global.room3LevelId = response.data.id;
    })

    if (global.deepMode) {
      test('Patch Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.name = uuidv4()
        let response = await axios.patch("/rooms/"+global.room3LevelId, {name: body.name})

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/rooms/"+global.room3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))
      })

      test('Get Floor Children', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/floors/"+global.floor3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("room")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })

      test('Delete Room', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.delete("/rooms/"+global.room3LevelId)
      })

      test('Get Floor Children After Delete', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/floors/"+global.floor3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data.children.length).toEqual(0)
      })

      test('Add Room (Again)', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        body.floor_id = global.floor3LevelId
        let response = await axios.post("/rooms", body)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("room")
        expect(response.data).toEqual(expect.objectContaining(body))

        global.room3LevelId = response.data.id;
      })

      test('Get Floor Children After Add Again', async () => {
        let axios = testAxiosBuilder(global.accessToken)
        let response = await axios.get("/floors/"+global.floor3LevelId)

        expect(response.data.id).toBeTruthy()
        expect(response.data.type).toEqual("floor")
        expect(response.data.children.length).toEqual(1)
        expect(response.data.children[0].type).toEqual("room")
        expect(response.data.children[0]).toEqual(expect.objectContaining(body))
      })
    }
  })

  describe('Test get all place in a building', () => {
    test('Get places in 3 level building', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      let response = await axios.get("/places/buildings/"+global.building3LevelId+"?include_building=1");
      let data = response.data;

      expect(data.length).toEqual(3)
      
      let building = data[0];
      let floor, room;

      if (data[1].type == 'floor') floor = data[1]; else room = data[1];
      if (data[2].type == 'floor') floor = data[2]; else room = data[2];

      expect(building.type).toEqual("building")
      expect(building.id).toEqual(global.building3LevelId)
      expect(floor.id).toEqual(global.floor3LevelId)
      expect(room.id).toEqual(global.room3LevelId)
    })

    test('Get places in 2 level building', async () => {
      let axios = testAxiosBuilder(global.accessToken)
      let response = await axios.get("/places/buildings/"+global.building2LevelId+"?include_building=1");
      let data = response.data;

      expect(data.length).toEqual(2)

      let building = data[0];
      let room = data[1];

      expect(building.type).toEqual("building")
      expect(building.id).toEqual(global.building2LevelId)
      expect(room.id).toEqual(global.room2LevelId)
    })
  })
}