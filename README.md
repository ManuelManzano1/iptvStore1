# IptvStore

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Deployment and Docker

1. Copy `.env.example` to `.env` and rellena los valores de PayPal y SMTP.
2. Instala dependencias del backend:

```bash
cd backend
npm install
```

3. Construye y levanta los servicios:

```bash
cd ..
docker compose up --build
```

4. Abre `http://localhost` para ver la tienda IPTV.

5. El backend se expondrá en `http://localhost:3000` para `/api`.

### Notas

- El pago de PayPal redirige a tu cuenta con el `business` configurado en `.env`.
- El frontend usa un proxy nginx para enrutar `/api` al backend Node.
- El email de notificación se envía al `EMAIL_TO` configurado.
- El panel admin está en `http://localhost/admin`.

## Production

Usa un host Docker compatible e instala un certificado SSL si vas a exponerlo en internet.
