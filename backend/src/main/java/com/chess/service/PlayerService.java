package com.chess.service;

import com.chess.dto.PlayerDTO;
import com.chess.model.User;
import com.chess.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PlayerService {

    private final UserRepository userRepository;
    
    // In-memory store for online players (username -> sessionId)
    private final Map<String, String> onlinePlayers = new ConcurrentHashMap<>();

    public PlayerService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void playerConnected(String username, String sessionId) {
        onlinePlayers.put(username, sessionId);
    }

    public void playerDisconnected(String username) {
        onlinePlayers.remove(username);
    }

    public void playerDisconnectedBySession(String sessionId) {
        onlinePlayers.entrySet().removeIf(entry -> entry.getValue().equals(sessionId));
    }

    public boolean isPlayerOnline(String username) {
        return onlinePlayers.containsKey(username);
    }

    public Optional<String> getSessionId(String username) {
        return Optional.ofNullable(onlinePlayers.get(username));
    }

    public List<PlayerDTO> getOnlinePlayers() {
        return onlinePlayers.keySet().stream()
                .map(username -> {
                    Optional<User> user = userRepository.findByUsername(username);
                    return user.map(u -> PlayerDTO.builder()
                            .id(u.getId())
                            .username(u.getUsername())
                            .online(true)
                            .build()).orElse(null);
                })
                .filter(p -> p != null)
                .collect(Collectors.toList());
    }

    public List<PlayerDTO> getOnlinePlayersExcept(String username) {
        return getOnlinePlayers().stream()
                .filter(p -> !p.getUsername().equals(username))
                .collect(Collectors.toList());
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
}
