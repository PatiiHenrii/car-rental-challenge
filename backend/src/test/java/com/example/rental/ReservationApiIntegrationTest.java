package com.example.rental;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** End-to-end API tests against the real H2 database and seed data (c1..c6, u1..u2). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReservationApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void listsCarsInSnakeCase() throws Exception {
        mvc.perform(get("/cars"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[0].license_plate").exists())
                .andExpect(jsonPath("$[0].rate_per_day").exists());
    }

    @Test
    void unknownCarIsNotFoundProblem() throws Exception {
        mvc.perform(get("/cars/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Car nope not found"));
    }

    @Test
    void fullReservationLifecycle() throws Exception {
        String created = mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content(body("c1", "u1", "2030-05-01T10:00:00", "2030-05-04T10:00:00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.reservation_id");

        mvc.perform(get("/reservations").param("userId", "u1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains(id)))
                .andExpect(jsonPath("$[0].customer_name").value("Alice Johnson"))
                .andExpect(jsonPath("$[0].total_price").value(135.0))
                .andExpect(jsonPath("$[0].pickup_time").value("2030-05-01T10:00:00"));

        // car c1 is no longer offered for an overlapping period, but c2 still is
        mvc.perform(get("/cars").param("pickupTime", "2030-05-02T00:00:00").param("dropoffTime", "2030-05-03T00:00:00"))
                .andExpect(jsonPath("$[*].id", not(hasItem("c1"))))
                .andExpect(jsonPath("$[*].id", hasItem("c2")))
                .andExpect(jsonPath("$[*].id", not(hasItem("c5")))); // maintenance

        mvc.perform(put("/reservations/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content(body("c2", "u1", "2030-05-01T10:00:00", "2030-05-03T10:00:00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.car_id").value("c2"))
                .andExpect(jsonPath("$.total_price").value(97.0));

        mvc.perform(delete("/reservations/" + id)).andExpect(status().isNoContent());
        mvc.perform(delete("/reservations/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void doubleBookingIsConflict() throws Exception {
        mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content(body("c3", "u1", "2030-06-01T10:00:00", "2030-06-05T10:00:00")))
                .andExpect(status().isCreated());

        mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content(body("c3", "u2", "2030-06-04T10:00:00", "2030-06-07T10:00:00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Tesla Model 3 is already booked for the selected period"));
    }

    @Test
    void backToBackBookingsDoNotOverlap() throws Exception {
        mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content(body("c4", "u1", "2030-07-01T10:00:00", "2030-07-03T10:00:00")))
                .andExpect(status().isCreated());
        mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content(body("c4", "u2", "2030-07-03T10:00:00", "2030-07-05T10:00:00")))
                .andExpect(status().isCreated());
    }

    @Test
    void invalidPayloadReturnsFieldErrors() throws Exception {
        mvc.perform(post("/reservations").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"car_id\":\"\",\"user_id\":\"u1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.car_id").exists())
                .andExpect(jsonPath("$.errors.pickup_time").exists())
                .andExpect(jsonPath("$.errors.dropoff_time").exists());
    }

    @Test
    void reservationsOfUnknownUserIsNotFound() throws Exception {
        mvc.perform(get("/reservations").param("userId", "ghost")).andExpect(status().isNotFound());
    }

    private static String body(String carId, String userId, String pickup, String dropoff) {
        return """
                {"car_id":"%s","user_id":"%s","pickup_time":"%s","dropoff_time":"%s"}
                """.formatted(carId, userId, pickup, dropoff);
    }
}
