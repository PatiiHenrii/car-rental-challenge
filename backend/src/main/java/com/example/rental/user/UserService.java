package com.example.rental.user;

import com.example.rental.common.ConflictException;
import com.example.rental.common.NotFoundException;
import com.example.rental.user.UserDtos.CreateUserRequest;
import com.example.rental.user.UserDtos.UserResponse;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll(Sort.by("name")).stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(String id) {
        return UserResponse.from(getUser(id));
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String name = request.name().trim();
        if (userRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("User '" + name + "' already exists");
        }
        return UserResponse.from(userRepository.save(new User(name)));
    }

    /** Entity lookup shared with other services. */
    @Transactional(readOnly = true)
    public User getUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }
}
