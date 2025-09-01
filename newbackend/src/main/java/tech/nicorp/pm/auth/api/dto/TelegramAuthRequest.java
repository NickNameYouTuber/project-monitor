package tech.nicorp.pm.auth.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TelegramAuthRequest {
    @Schema(example = "123456789")
    private String telegram_id; // from widget: id

    @Schema(example = "John")
    private String first_name;

    @Schema(example = "Doe")
    private String last_name;

    @Schema(example = "johndoe")
    private String username;

    @Schema(example = "https://t.me/i/userpic.jpg")
    private String photo_url;

    @Schema(example = "1725150000")
    private String auth_date;

    @Schema(example = "<telegram_hash>")
    private String hash;

    @Schema(example = "")
    private String init_data; // optional (WebApp), not used for Login Widget
}


