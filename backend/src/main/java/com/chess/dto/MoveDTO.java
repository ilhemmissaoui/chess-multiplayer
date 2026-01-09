package com.chess.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoveDTO {

    private Long gameId;
    private String from;
    private String to;
    private String piece;
    private String promotion;
    private String fenAfter;
    private String sanNotation;
    private Integer moveNumber;
    private String playerColor;
}
