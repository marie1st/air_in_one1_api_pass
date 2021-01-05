const { testAxiosBuilder } = require("./utils/testAxios");
const { v4: uuidv4 } = require("uuid");
const _ = require('lodash')

module.exports.default = () => {
  describe("Test Air", () => {
    test("Add air", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let body = {
        activePage: "insurance",
        building: {
          id: 2,
          name: "Building 1",
          avatar: "",
          is_two_level: true,
          position: {
            top: 0.3,
            left: 0.2,
            width: 0.5,
            height: 0.2,
          },
        },
        device: {
          device_detail: {
            name: "CEO's superair",
            device_type_id: 1,
          },
          device_control_air: {
            device_air_brand_id: 2,
            device_air_type_id: 1,
            device_wifi_ssid: "CEO only",
            device_wifi_password: "mynameisceo",
            device_air_productcode: "CEO special version",
            device_air_product_generation: "CEO master",
            device_air_upgrade_version: 1.1,
            device_air_version: 1,
            technician: {
              name: "xxx",
              phone: "0831774921",
              address: "dasd",
              under_shop_name: "dasdassd",
            },
            device_iot_id: "5CCF7F365745",
            device_mqtt_hostname: "mqtt.eclipse.org",
            device_mqtt_port: 1883,
            device_mqtt_username: "",
            device_mqtt_password: "",
            device_private_ip_address: "192.168.1.101",
            device_static_ip_address: "221.311.431.5",
            device_air_buy_form: "",
            warranty_all_part_month: 0,
            warranty_compressor_month: 0,
            warranty_installation_month: 0,
          },
        },
      };

      let response = await axios.post("/devices", body)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")

      global.deviceAirId = response.data.id
    });

    test("Add air to room", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let response = await axios.patch("rooms/"+global.room3LevelId+"/devices", {device_ids: [global.deviceAirId]})

      expect(response.data.id).toEqual(global.room3LevelId)
      expect(response.data.type).toEqual("room")
      expect(response.data.children.length).toEqual(1)
      expect(response.data.children[0].type).toEqual("device")
      expect(response.data.children[0].id).toEqual(global.deviceAirId)
    });

    test("Power on air", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let response = await axios.post("/devices/device_control_air/turn_on?scope_type=room&scope_id="+global.room3LevelId)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
    });

    test("Set air fan speed", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let value = _.sample(['A', 'B', '3', '4', '5', '6', '7']);

      let response = await axios.patch("/devices/device_control_air?scope_type=room&scope_id="+global.room3LevelId, {
        device_fan_speed: value
      });

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
      expect(response.data.device_control_air.device_fan_speed).toEqual(value)
    });

    test("Set air mode", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let value = _.sample(['0', '2', '3', '6']);

      let response = await axios.patch("/devices/device_control_air?scope_type=room&scope_id="+global.room3LevelId, {
        device_mode: value
      });

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
      expect(response.data.device_control_air.device_mode).toEqual(value)
    });

    test("Set air swing mode", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let value = _.sample(['0', '1', '2', '3']);

      let response = await axios.patch("/devices/device_control_air?scope_type=room&scope_id="+global.room3LevelId, {
        device_swing_mode: value
      });

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
      expect(response.data.device_control_air.device_swing_mode).toEqual(value)
    });

    test("Set air is locked remote", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let value = _.sample(['L', 'S', 'U']);

      let response = await axios.patch("/devices/device_control_air?scope_type=room&scope_id="+global.room3LevelId, {
        device_is_locked_remote: value
      });

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
      expect(response.data.device_control_air.device_is_locked_remote).toEqual(value)
    });

    test("Set air temp", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let value = Math.floor(Math.random() * 13 + 18);

      let response = await axios.patch("/devices/device_control_air?scope_type=room&scope_id="+global.room3LevelId, {
        device_temp: value
      });

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("on")
      expect(response.data.device_control_air.device_status).toEqual("1")
      expect(response.data.device_control_air.device_temp).toEqual(value)
    });

    test("Power off air", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let response = await axios.post("/devices/device_control_air/turn_off?scope_type=room&scope_id="+global.room3LevelId)

      expect(response.data.id).toBeTruthy()
      expect(response.data.type).toEqual("device")
      expect(response.data.status).toEqual("off")
      expect(response.data.device_control_air.device_status).toEqual("0")
    });

    test("Remove air from room", async () => {
      let axios = testAxiosBuilder(global.accessToken);

      let response = await axios.patch("rooms/"+global.room3LevelId+"/devices", {device_ids: []})

      expect(response.data.id).toEqual(global.room3LevelId)
      expect(response.data.type).toEqual("room")
      expect(response.data.children.length).toEqual(0)
    });
  });
};
