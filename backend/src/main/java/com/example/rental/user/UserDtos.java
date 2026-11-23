package com.example.rental.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(String id, String name) {

        static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getName());
        }
    }

    public record CreateUserRequest(@NotBlank @Size(max = 100) String name) {
    }
}
