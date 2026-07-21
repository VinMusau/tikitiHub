package com.example.tikitihub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TikitihubApplication {

	public static void main(String[] args) {
		SpringApplication.run(TikitihubApplication.class, args);
	}

}
